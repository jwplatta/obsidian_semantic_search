import Sqlite3 from 'better-sqlite3'
import * as sqliteVss from 'sqlite-vss'
import { pipeline } from '@xenova/transformers'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import * as tf from '@tensorflow/tfjs'
import fs from 'fs'
import {
  countVss, countChunks, createEmbeddingsTable,
  createVirtualTable, insertFileEmbeddingsIntoVSS,
  insertEmbeddingsIntoVSS, deleteFileFromVss, deleteFromVss,
  deleteFileFromNoteChunks, embeddingsQuery,
  deleteFilesFromNoteChunks, insertMultipleNoteChunks
} from './sql.js'
import path from 'path'

export class VectorStore {
  constructor (dbPath) {
    this.db = new Sqlite3(dbPath)
    sqliteVss.load(this.db)
  }

  info (callback) {
    try {
      const info = {
        vssSize: this.size(),
        chunkCnt: this.chunkCount()
      }

      if (callback) {
        callback(null, info)
      } else {
        return info
      }
    } catch (error) {
      if (callback) {
        callback(error, null)
      } else {
        throw new Error('Error VectorStore.info: ', error)
      }
    }
  }

  chunkCount () {
    try {
      const chunkCount = this.db.prepare(countChunks).pluck().get()
      return chunkCount
    } catch (error) {
      throw new Error('Error VectorStore.chunkCount: ', error)
    }
  }

  size () {
    try {
      const vssCount = this.db.prepare(countVss).pluck().get()
      return vssCount
    } catch (error) {
      throw new Error('Error VectorStore.size: ', error)
    }
  }

  async embedFile (chunkSize, chunkOverlap, model, fileName, filePath, vaultPath) {
    try {
      this.deleteFileEmbedding(fileName)
      await this.createEmbedding(chunkSize, chunkOverlap, model, fileName, filePath, vaultPath)
      this.updateFileIndex(fileName)
    } catch (error) {
      throw new Error('Error VectorStore.embed_file: ', error)
    }
  }

  fileNames () {
    try {
      const fileNames = this.db.prepare('SELECT distinct file_name FROM note_chunks').all()
      return fileNames
    } catch (error) {
      throw new Error('Error VectorStore.fileNames: ', error)
    }
  }

  deleteFilesEmbedding (fileNames) {
    const deleteFilesFromNoteChunksSQL = deleteFilesFromNoteChunks(fileNames)
    this.db.prepare(deleteFilesFromNoteChunksSQL).run(...fileNames)
  }

  async embedBatch (chunkSize, chunkOverlap, model, files, vaultPath) {
    this.db.pragma('synchronous = OFF')
    this.db.pragma('journal_mode = MEMORY')

    const fileNames = files.map((file) => { return file.fileName })
    this.deleteFilesEmbedding(fileNames)

    await files.forEach(async (file) => {
      await this.createEmbedding(chunkSize, chunkOverlap, model, file.fileName, file.filePath, vaultPath)
    })

    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('journal_mode = DELETE')
  }

  async createEmbedding (chunkSize, chunkOverlap, model, fileName, filePath, vaultPath) {
    function readFileContent (vaultPath, filePath) {
      const fullPath = path.join(vaultPath, filePath)
      const fileContent = fs.readFileSync(fullPath, 'utf-8')
      return fileContent
    }

    const fileContent = readFileContent(vaultPath, filePath)
    const embedder = await pipeline('feature-extraction', model)
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: chunkSize | 500,
      chunkOverlap: chunkOverlap | 100
    })
    const chunks = await splitter.createDocuments([fileContent])
    const textChunks = chunks.map((chunk, index) => {
      return chunk.pageContent
    })

    if (textChunks.length === 0) { return }

    const embeddings = await embedder(textChunks)
    const meanTensor = tf.tensor(embeddings.data)
      .reshape(embeddings.dims)
      .mean(1)

    const insertMultipleSql = insertMultipleNoteChunks(textChunks.length)
    const sqlInsert = this.db.prepare(insertMultipleSql)
    const values = meanTensor.arraySync().map((embedding, index) => {
      return [fileName, filePath, textChunks[index], JSON.stringify(embedding)]
    }).flat()

    sqlInsert.run(...values)
  }

  updateIndex () {
    this.wrapInTransaction(() => {
      this.db.prepare(deleteFromVss).run()
      this.db.prepare(insertEmbeddingsIntoVSS).run()
    })
  }

  updateFileIndex (fileName) {
    this.db.prepare(insertFileEmbeddingsIntoVSS).run(fileName)
  }

  reset () {
    this.db.prepare('DELETE FROM vss_note_chunks').run()
    this.db.prepare('DELETE FROM note_chunks').run()
  }

  deleteFileEmbedding (fileName) {
    this.wrapInTransaction(() => {
      this.db.prepare(deleteFileFromVss).run(fileName)
      this.db.prepare(deleteFileFromNoteChunks).run(fileName)
      console.log('deleteFileEmbedding - vss size: ', this.size())
    })
  }

  async query (queryString, searchResultsCount, model) {
    const embedder = await pipeline('feature-extraction', model)
    const embeddings = await embedder([queryString])
    const queryEmbedding = tf.tensor(embeddings[0].data)
      .reshape(embeddings[0].dims)
      .mean(0)

    try {
      const searchResults = this.db.prepare(embeddingsQuery).all(
        '[' + queryEmbedding.arraySync().toString() + ']',
        searchResultsCount
      )
      return searchResults
    } catch (error) {
      throw new Error('Error VectorStore.query: ', error)
    }
  }

  wrapInTransaction (func) {
    this.db.exec('BEGIN')

    try {
      func()
      this.db.exec('COMMIT')
      return true
    } catch (error) {
      console.error(error)
      this.db.exec('ROLLBACK')
      return false
    }
  }

  async configure (model) {
    try {
      await pipeline('feature-extraction', model)
      this.db.prepare(createEmbeddingsTable).run()
      this.db.prepare(createVirtualTable).run()
    } catch (error) {
      throw new Error('Error VectorStore.configure: ', error)
    }
  }
}
