import express from 'express'
import cors from 'cors'
import { VectorStore } from './src/db/vector_store.js'

const DB_PATH = 'obsidian_semantic_search.db'
const app = express()
app.use(express.json())
app.use(cors())
const PORT = process.env.PORT || 3003

app.get('/check_status', (req, res) => { res.sendStatus(200) })

app.post('/info', (req, res) => {
  console.log('/info\n', req.body)

  const vectDb = new VectorStore(DB_PATH)

  vectDb.info((err, result) => {
    if (err) {
      res.sendStatus(500)
    } else {
      res.status(200).json(result)
    }
  })
})

app.post('/configure', (req, res) => {
  console.log('/configure\n', req.body)

  try {
    new VectorStore(DB_PATH).configure(req.body.model)
    res.sendStatus(200)
  } catch (error) {
    console.error(error)
    res.sendStatus(500)
  }
})

app.post('/embed_file', async (req, res) => {
  console.log('/embed_file\n', req.body)

  try {
    const vectDb = new VectorStore(DB_PATH)
    vectDb.embedFile(
      req.body.chunkSize,
      50,
      req.body.model,
      req.body.fileName,
      req.body.filePath,
      req.body.vaultPath
    )

    res.sendStatus(200)
  } catch (error) {
    console.error(error)
    res.sendStatus(500)
  }
})

app.post('/embed_batch', async (req, res) => {
  console.log('/embed_batch\n', req.body)
  const vectDb = new VectorStore(DB_PATH)
  try {
    await vectDb.embedBatch(
      req.body.chunkSize,
      50,
      req.body.model,
      req.body.files,
      req.body.vaultPath
    )

    res.sendStatus(200)
  } catch (error) {
    console.error(error)
    res.sendStatus(500)
  }
})

app.post('/embedded_files', async (req, res) => {
  console.log('/embedded_files\n', req.body)
  try {
    const fileNames = new VectorStore(DB_PATH).fileNames()
    console.log('fileNames: ', fileNames)
    res.status(200).json(fileNames)
  } catch (error) {
    console.error(error)
    res.sendStatus(500)
  }
})

app.post('/reset', async (req, res) => {
  console.log('/reset\n', req.body)
  try {
    new VectorStore(DB_PATH).reset()
    res.sendStatus(200)
  } catch (error) {
    console.error(error)
    res.sendStatus(500)
  }
})

app.post('/update_index', (req, res) => {
  console.log('/update_index\n', req.body)

  try {
    new VectorStore(DB_PATH).updateIndex()
    res.sendStatus(200)
  } catch (error) {
    console.error(error)
    res.sendStatus(500)
  }
})

app.post('/query', async (req, res) => {
  console.log('/query\n', req.body)

  if (!req.body.query || req.body.query.trim() === '') {
    res.status(200).json([])
    return
  }

  const vectDb = new VectorStore(DB_PATH)
  try {
    const searchResults = await vectDb.query(
      req.body.query,
      req.body.searchResultsCount,
      req.body.model
    )

    res.status(200).json(searchResults)
  } catch (error) {
    console.error(error)
    res.sendStatus(500)
  }
})

app.listen(PORT, () => {
  console.log(`Semantic Search server running on port ${PORT}`)
})
