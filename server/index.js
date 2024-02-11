import express from 'express';
import cors from 'cors';
import { VectorStore } from './src/db/vector_store.js';
import { buildDbPath } from './src/util.js';

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3003;

app.get('/check_status', (req, res) => { res.sendStatus(200) });

app.post('/configure_db', (req, res) => {
  try {
    new VectorStore(buildDbPath(req.body)).configure();
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/create_embedding', async (req, res) => {
  const vect_db = new VectorStore(buildDbPath(req.body));
  try {
    await vect_db.embed(
      req.body.chunkSize,
      50,
      req.body.model,
      req.body.fileContent,
      req.body.fileName,
      req.body.filePath
    )
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/delete_embedding', async (req, res) => {
  try {
    new VectorStore(buildDbPath(req.body))
      .deleteFileChunks(req.body.fileName);
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/update_index', async (req, res) => {
  try {
    const vect_db = new VectorStore(buildDbPath(req.body));
    vect_db.updateIndex(req.body.fileName);
    // console.log("vect_db.size(): ", vect_db.size());

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/query', async (req, res) => {
  if (!req.body.query || req.body.query.trim() === '') {
    res.status(200).json([]);
    return;
  }

  try {
    const searchResults = await new VectorStore(buildDbPath(req.body)).query(
      req.body.query,
      req.body.searchResultsCount,
      req.body.model
    );
    res.status(200).json(searchResults);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Semantic Search server running on port ${PORT}`);
});