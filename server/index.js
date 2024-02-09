import * as sqlite_vss from "sqlite-vss";
import sqlite3 from 'better-sqlite3';
import express from 'express';
import path from 'path';
import cors from 'cors';
import { pipeline } from '@xenova/transformers';
import * as tf from '@tensorflow/tfjs';

const app = express();
app.use(express.json());
app.use(cors());

app.get('/check_status', (req, res) => {
  res.sendStatus(200);
});

app.post('/configure_db', (req, res) => {
  // TODO: check if running docker container
  const joinedPath = path.join(
    req.body.vaultPath,
    req.body.dataStorePath,
    'semantic_search.db'
  );

  const db = new sqlite3(joinedPath);
  sqlite_vss.load(db);
  // const version = db.prepare("SELECT vss_version();").pluck().get();
  // console.log("vss_version: ", version);

  const createEmbeddingsTable = `
    CREATE TABLE IF NOT EXISTS note_chunks (
      file_name VARCHAR(255),
      file_path TEXT,
      text_chunk TEXT,
      embedding BLOB
    )
  `;
  try {
    db.prepare(createEmbeddingsTable).run();
  } catch (error) {
    console.error(error);
  }

  const createVirtualTable = `
  CREATE VIRTUAL TABLE IF NOT EXISTS vss_note_chunks USING vss0(
    embedding(384)
  )
  `;
  try {
    db.prepare(createVirtualTable).run();
  } catch (error) {
    console.error(error);
  }

  res.sendStatus(200);
});

app.post('/embed', async (req, res) => { //TODO: remove async
  const joinedPath = path.join(
    req.body.vaultPath,
    req.body.dataStorePath,
    'semantic_search.db'
  );
  const db = new sqlite3(joinedPath);
  sqlite_vss.load(db);

  // STEP: delete embeddings if they exist
  const fileName = req.body.fileName;
  let embeddingsCount;
  try {
    const embeddingsCountStmt = db.prepare('SELECT count(1) FROM note_chunks WHERE file_name = ?');
    console.log(embeddingsCountStmt);
    embeddingsCount = embeddingsCountStmt.pluck().get(fileName);
    console.log('embeddingsCount: ', embeddingsCount);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }

  if (embeddingsCount > 0) {
    const removeEmbeddingsStmt = db.prepare('DELETE FROM note_chunks WHERE file_name = ?');
    try {
      removeEmbeddingsStmt.run(fileName);
    } catch (error) {
      console.error(error);
      res.sendStatus(500);
    }
  }

  // STEP: generate the embeddings and insert them into the database
  const filePath = req.body.filePath;
  const fileContent = req.body.fileContent;
  const chunkSize = req.body.chunkSize;
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  const stmt = db.prepare('INSERT INTO note_chunks (file_name, file_path, text_chunk, embedding) VALUES (?, ?, ?, ?)');

  for (let i = 0; i < fileContent.length; i += chunkSize) {
    try {
      const chunk = fileContent.substring(i, i + chunkSize);
      const embeddings = await embedder([chunk]);
      const meanTensor = tf.tensor(embeddings[0]['data'])
        .reshape(embeddings[0]['dims'])
        .mean(0);
      const embeddingJSON = JSON.stringify(meanTensor.arraySync());
      stmt.run(fileName, filePath, chunk, embeddingJSON);
    } catch (error) {
      console.error(error);
      res.sendStatus(500);
    }
  }

  // STEP: update the virtual table
  const insertEmbeddingsIntoVSS = `
    INSERT INTO vss_note_chunks(rowid, embedding)
    SELECT rowid, embedding
    FROM note_chunks
    WHERE rowid NOT IN (SELECT rowid FROM vss_note_chunks)
  `;

  try {
    db.prepare(insertEmbeddingsIntoVSS).run();
  } catch (error) {
    console.error(insertEmbeddingsIntoVSS, error);
    res.sendStatus(500);
  }

  res.sendStatus(200);
});

app.post('/embed_multiple', (req, res) => {
  console.log('files recieved: ', req.body);
  res.sendStatus(200);
});

// NOTE: this needs to async
app.post('/query', async (req, res) => {
  console.log('QUERY recieved: ', req.body.query);

  if (req.body.query === '') {
    res.sendStatus(200);
    return;
  }

  const joinedPath = path.join(
    req.body.vaultPath,
    req.body.dataStorePath,
    'semantic_search.db'
  );

  const db = new sqlite3(joinedPath);
  sqlite_vss.load(db);

  // STEP: embed the query
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  const embeddings = await embedder([req.body.query]);
  const queryEmbedding = tf.tensor(embeddings[0]['data'])
    .reshape(embeddings[0]['dims'])
    .mean(0);

  const searchResultsCount = req.body.searchResultsCount;
  const searchEmbeddings = `
    WITH matches AS (
      SELECT
        rowid,
        distance
      FROM vss_note_chunks
      WHERE vss_search(
        embedding,
        ?
      )
      LIMIT ?
    )
    SELECT
      note_chunks.rowid,
      note_chunks.file_name,
      note_chunks.file_path,
      note_chunks.text_chunk,
      matches.distance
    FROM matches
    LEFT JOIN note_chunks ON note_chunks.rowid = matches.rowid;
  `;
  try {
    console.log(searchEmbeddings);
    const searchResults = db.prepare(searchEmbeddings).all(
      "[" + queryEmbedding.arraySync().toString() + "]",
      searchResultsCount
    );
    res.status(200).json(searchResults);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});