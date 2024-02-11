import * as sqlite_vss from "sqlite-vss";
import sqlite3 from 'better-sqlite3';
import express from 'express';
import path from 'path';
import cors from 'cors';
import { pipeline } from '@xenova/transformers';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as tf from '@tensorflow/tfjs';
import { VectorStore } from './src/db/vector_store.js';
import {
  insertEmbeddingsIntoVSS,
  deleteFromVss,
  deleteFromNoteChunks,
  insertNoteChunk,
  embeddingsQuery
} from './src/db/sql.js';

//TODO: move all the sql to a separate file

const app = express();
app.use(express.json());
app.use(cors());

app.get('/check_status', (req, res) => {
  res.sendStatus(200);
});

app.post('/configure_db', (req, res) => {
  // TODO: check if running docker container
  const dbPath = path.join(
    req.body.vaultPath,
    req.body.dataStorePath,
    req.body.dataStoreFilename
  );

  try {
    new VectorStore(dbPath).configure();
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/create_embedding', async (req, res) => {
  const fileName = req.body.fileName;
  const dbPath = path.join(
    req.body.vaultPath,
    req.body.dataStorePath,
    req.body.dataStoreFilename
  );

  const vect_db = new VectorStore(dbPath);
  const filePath = req.body.filePath;
  const fileContent = req.body.fileContent;
  const chunkSize = req.body.chunkSize;
  const model = req.body.model;
  const embedder = await pipeline('feature-extraction', model);
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize,
    chunkOverlap: 50
  });
  const chunks = await splitter.createDocuments([fileContent]);
  const insertPromises = chunks.map(async(chunk, index) => {
    try {
      const embeddings = await embedder([chunk.pageContent]);
      const meanTensor = tf.tensor(embeddings[0]['data'])
          .reshape(embeddings[0]['dims'])
          .mean(0);
      const embeddingJSON = JSON.stringify(meanTensor.arraySync());

      vect_db.db.prepare(insertNoteChunk)
        .run(fileName, filePath, chunk.pageContent, embeddingJSON);
    } catch (error) {
      console.error(error);
      res.sendStatus(500);
    }
  });

  await Promise.all(insertPromises);

  res.sendStatus(200);
});

app.post('/delete_embedding', async (req, res) => {
  const fileName = req.body.fileName;
  const dbPath = path.join(
    req.body.vaultPath,
    req.body.dataStorePath,
    req.body.dataStoreFilename
  );
  const vect_db = new VectorStore(dbPath);

  vect_db.db.exec('BEGIN TRANSACTION');
  try {
    vect_db.db.prepare(deleteFromVss).run(fileName);
    vect_db.db.prepare(deleteFromNoteChunks).run(fileName);
  } catch (error) {
    vect_db.db.exec('ROLLBACK');
    console.error("delete file note chunks", ": ", error);
    res.sendStatus(500);
  }
  vect_db.db.exec('COMMIT');
  res.sendStatus(200);
});

app.post('/update_index', async (req, res) => {
  const fileName = req.body.fileName;
  const dbPath = path.join(
    req.body.vaultPath,
    req.body.dataStorePath,
    req.body.dataStoreFilename
  );
  const vect_db = new VectorStore(dbPath);

  // STEP: update the virtual table
  try {
    const insertEmbeddingsIntoVSSStmt = vect_db.db.prepare(insertEmbeddingsIntoVSS);
    insertEmbeddingsIntoVSSStmt.run(fileName);
  } catch (error) {
    console.error(insertEmbeddingsIntoVSS, error);
    res.sendStatus(500);
  }

  try {
    const vssCountStmt = vect_db.db.prepare('SELECT count(1) FROM vss_note_chunks');
    const vssCount = vssCountStmt.pluck().get();
    console.log("vssCount ", vssCount);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }

  res.sendStatus(200);

});

// NOTE: this needs to async
app.post('/query', async (req, res) => {
  console.log('QUERY recieved: ', req.body);

  if (!req.body.query || req.body.query.trim() === '') {
    res.status(200).json([]);
    return;
  }

  const joinedPath = path.join(
    req.body.vaultPath,
    req.body.dataStorePath,
    req.body.dataStoreFilename
  );

  console.log('database path: ', joinedPath);

  const db = new sqlite3(joinedPath);
  sqlite_vss.load(db);

  // STEP: embed the query
  const embedder = await pipeline('feature-extraction', req.body.model);
  const embeddings = await embedder([req.body.query]);
  const queryEmbedding = tf.tensor(embeddings[0]['data'])
    .reshape(embeddings[0]['dims'])
    .mean(0);

  const searchResultsCount = req.body.searchResultsCount;

  try {
    const vssCountStmt = db.prepare('SELECT count(1) FROM vss_note_chunks');
    const vssCount = vssCountStmt.pluck().get();
    console.log("vssCount ", vssCount);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }

  try {
    const searchResults = db.prepare(embeddingsQuery).all(
      "[" + queryEmbedding.arraySync().toString() + "]",
      searchResultsCount
    );
    console.log(searchResults);
    res.status(200).json(searchResults);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Semantic Search server running on port ${PORT}`);
});