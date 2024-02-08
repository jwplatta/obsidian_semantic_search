import * as sqlite_vss from "sqlite-vss";
import sqlite3 from 'better-sqlite3';
import express from 'express';
import path from 'path';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

app.get('/status', (req, res) => {
  res.sendStatus(200);
});

app.post('/configure_db', (req, res) => {
  const joinedPath = path.join(
    req.body.vaultPath,
    req.body.dataStorePath,
    'note_vectors.db'
  );

  const db = new sqlite3(joinedPath);
  sqlite_vss.load(db);
  const version = db.prepare("SELECT vss_version();").pluck().get();
  console.log("vss_version: ", version);

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

app.post('/embed', (req, res) => {
  console.log('file recieved: ', req.body);
  res.sendStatus(200);
});

app.post('/embed_multiple', (req, res) => {
  console.log('files recieved: ', req.body);
  res.sendStatus(200);
});

app.post('/query', (req, res) => {
  console.log('query recieved: ', req.body);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});