import Sqlite3 from 'better-sqlite3'
import * as sqliteVss from 'sqlite-vss'
import { pipeline } from '@xenova/transformers'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import * as tf from '@tensorflow/tfjs'
import {
  countVss, countChunks, createEmbeddingsTable,
  createVirtualTable, insertNoteChunk,
  insertEmbeddingsIntoVSS, deleteFromVss,
  deleteFromNoteChunks, embeddingsQuery
} from './sql.js'

export class VectorStore {
  constructor (dbPath) {
    this.db = new Sqlite3(dbPath)
    sqliteVss.load(this.db)
  }

  chunk_cnt () {
    try {
      const chunkCount = this.db.prepare(countChunks).pluck().get()
      return chunkCount
    } catch (error) {
      throw new Error('Error VectorStore.chunk_cnt: ', error)
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

  async embed (chunkSize, chunkOverlap, model, fileContent, fileName, filePath) {
    const embedder = await pipeline('feature-extraction', model)
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: chunkSize | 500,
      chunkOverlap: chunkOverlap | 100
    })
    const chunks = await splitter.createDocuments([fileContent])
    return chunks.map(async (chunk, index) => {
      try {
        const embeddings = await embedder([chunk.pageContent])
        const meanTensor = tf.tensor(embeddings[0].data)
          .reshape(embeddings[0].dims)
          .mean(0)
        const embeddingJSON = JSON.stringify(meanTensor.arraySync())

        this.db.prepare(insertNoteChunk)
          .run(fileName, filePath, chunk.pageContent, embeddingJSON)
      } catch (error) {
        throw new Error('Error VectorStore.embed: ', error)
      }
    })
  }

  updateIndex (fileName) {
    try {
      this.db.prepare(insertEmbeddingsIntoVSS).run(fileName)
    } catch (error) {
      throw new Error('Error VectorStore.updateIndex: ', error)
    }
  }

  deleteFileChunks (fileName) {
    this.wrapInTransaction(() => {
      this.db.prepare(deleteFromVss).run(fileName)
      this.db.prepare(deleteFromNoteChunks).run(fileName)
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

  configure () {
    try {
      this.db.prepare(createEmbeddingsTable).run()
      this.db.prepare(createVirtualTable).run()
    } catch (error) {
      throw new Error('Error VectorStore.configure: ', error)
    }
  }
}
