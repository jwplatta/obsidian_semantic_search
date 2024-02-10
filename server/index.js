import * as sqlite_vss from "sqlite-vss";
import sqlite3 from 'better-sqlite3';
import express from 'express';
import path from 'path';
import cors from 'cors';
import { pipeline } from '@xenova/transformers';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as tf from '@tensorflow/tfjs';
import { checkFileExists } from './src/util.js';

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

  if (!checkFileExists(joinedPath)) {
    res.sendStatus(200);
    return;
  }

  const db = new sqlite3(joinedPath);
  sqlite_vss.load(db);

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

app.post('/create_embedding', async (req, res) => {
  const fileName = req.body.fileName;
  const joinedPath = path.join(
    req.body.vaultPath,
    req.body.dataStorePath,
    'semantic_search.db'
  );
  const db = new sqlite3(joinedPath);
  sqlite_vss.load(db);

  const filePath = req.body.filePath;
  const fileContent = req.body.fileContent;
  const chunkSize = req.body.chunkSize;
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize,
    chunkOverlap: 50
  });
  const chunks = await splitter.createDocuments([fileContent]);
  db.exec('BEGIN TRANSACTION');
  const insertPromises = chunks.map(async(chunk, index) => {
    try {
      const embeddings = await embedder([chunk.pageContent]);
      const meanTensor = tf.tensor(embeddings[0]['data'])
          .reshape(embeddings[0]['dims'])
          .mean(0);
      const embeddingJSON = JSON.stringify(meanTensor.arraySync());

      db.prepare('INSERT INTO note_chunks (file_name, file_path, text_chunk, embedding) VALUES (?, ?, ?, ?)').run(fileName, filePath, chunk.pageContent, embeddingJSON);
    } catch (error) {
      db.exec('ROLLBACK');
      console.error(error);
      res.sendStatus(500);
    }
  });

  await Promise.all(insertPromises);
  db.exec('COMMIT');

  res.sendStatus(200);
});

app.post('/delete_embedding', async (req, res) => {
  const fileName = req.body.fileName;
  const joinedPath = path.join(
    req.body.vaultPath,
    req.body.dataStorePath,
    'semantic_search.db'
  );
  const db = new sqlite3(joinedPath);
  sqlite_vss.load(db);

  db.exec('BEGIN TRANSACTION');
  try {
    db.prepare(
      'DELETE FROM vss_note_chunks WHERE rowid IN (SELECT rowid FROM note_chunks WHERE file_name = ?)'
    ).run(fileName);
  } catch (error) {
    db.exec('ROLLBACK');
    console.error("removeEmbeddingsFromVSSStmt: ", error);
    res.sendStatus(500);
  }

  try {
    db.prepare('DELETE FROM note_chunks WHERE file_name = ?').run(fileName);
  } catch (error) {
    db.exec('ROLLBACK');
    console.error("removeEmbeddingsStmt: ", error);
    res.sendStatus(500);
  }

  db.exec('COMMIT');

  res.sendStatus(200);
});

app.post('/update_index', async (req, res) => {
  const fileName = req.body.fileName;
  const joinedPath = path.join(
    req.body.vaultPath,
    req.body.dataStorePath,
    'semantic_search.db'
  );
  const db = new sqlite3(joinedPath);
  sqlite_vss.load(db);

  // STEP: update the virtual table
  const insertEmbeddingsIntoVSS = `
    INSERT INTO vss_note_chunks(rowid, embedding)
    SELECT rowid, embedding
    FROM note_chunks
    WHERE file_name = ?
  `;

  try {
    db.exec('BEGIN TRANSACTION');
    const insertEmbeddingsIntoVSSStmt = db.prepare(insertEmbeddingsIntoVSS);
    insertEmbeddingsIntoVSSStmt.run(fileName);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error(insertEmbeddingsIntoVSS, error);
    res.sendStatus(500);
  }

  try {
    const vssCountStmt = db.prepare('SELECT count(1) FROM vss_note_chunks');
    const vssCount = vssCountStmt.pluck().get();
    console.log("vssCount ", vssCount);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
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

  const fileName = req.body.fileName;
  db.exec('BEGIN TRANSACTION');
  // STEP: delete embeddings if they exist. Delete from virtual store first
  const removeEmbeddingsFromVSSStmt = db.prepare(
    'DELETE FROM vss_note_chunks WHERE rowid IN (SELECT rowid FROM note_chunks WHERE file_name = ?)'
  );
  try {
    removeEmbeddingsFromVSSStmt.run(fileName);
  } catch (error) {
    db.exec('ROLLBACK');
    console.error("removeEmbeddingsFromVSSStmt: ", error);
    res.sendStatus(500);
  }

  const removeEmbeddingsStmt = db.prepare('DELETE FROM note_chunks WHERE file_name = ?');
  try {
    removeEmbeddingsStmt.run(fileName);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error("removeEmbeddingsStmt: ", error);
    res.sendStatus(500);
  }

  // try {
  //   const embeddingsCountStmt = db.prepare('SELECT count(1) FROM note_chunks WHERE file_name = ?');
  //   const embeddingsCount = embeddingsCountStmt.pluck().get(fileName);
  //   console.log("embeddingsCount ", embeddingsCount, " for ", fileName);
  // } catch (error) {
  //   console.error(error);
  //   res.sendStatus(500);
  // }

  // STEP: generate the embeddings and insert them into the database
  const filePath = req.body.filePath;
  const fileContent = req.body.fileContent;
  const chunkSize = req.body.chunkSize;
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  // for (let i = 0; i < fileContent.length; i += chunkSize) {
  //   try {
  //     const chunk = fileContent.substring(i, i + chunkSize);
  //     const embeddings = await embedder([chunk]);
  //     const meanTensor = tf.tensor(embeddings[0]['data'])
  //       .reshape(embeddings[0]['dims'])
  //       .mean(0);
  //     const embeddingJSON = JSON.stringify(meanTensor.arraySync());
  //     db.prepare('INSERT INTO note_chunks (file_name, file_path, text_chunk, embedding) VALUES (?, ?, ?, ?)').run(fileName, filePath, chunk, embeddingJSON);
  //   } catch (error) {
  //     console.error(error);
  //     res.sendStatus(500);
  //   }
  // }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize,
    chunkOverlap: 50
  });
  const chunks = await splitter.createDocuments([fileContent]);
  db.exec('BEGIN TRANSACTION');
  const insertPromises = chunks.map(async(chunk, index) => {
    try {
      const embeddings = await embedder([chunk.pageContent]);
      const meanTensor = tf.tensor(embeddings[0]['data'])
          .reshape(embeddings[0]['dims'])
          .mean(0);
      const embeddingJSON = JSON.stringify(meanTensor.arraySync());

      db.prepare('INSERT INTO note_chunks (file_name, file_path, text_chunk, embedding) VALUES (?, ?, ?, ?)').run(fileName, filePath, chunk.pageContent, embeddingJSON);
    } catch (error) {
      db.exec('ROLLBACK');
      console.error(error);
      res.sendStatus(500);
    }
  });
  // chunks.forEach(async(chunk, index) => {
  //   try {
  //     const embeddings = await embedder([chunk.pageContent]);
  //     const meanTensor = tf.tensor(embeddings[0]['data'])
  //       .reshape(embeddings[0]['dims'])
  //       .mean(0);
  //     const embeddingJSON = JSON.stringify(meanTensor.arraySync());

  //     db.prepare('INSERT INTO note_chunks (file_name, file_path, text_chunk, embedding) VALUES (?, ?, ?, ?)').run(fileName, filePath, chunk.pageContent, embeddingJSON);
  //   } catch (error) {
  //     console.error(error);
  //     res.sendStatus(500);
  //   }
  // });

  await Promise.all(insertPromises);
  db.exec('COMMIT');

  try {
    const noteChunksCountStmt = db.prepare('SELECT count(1) FROM note_chunks WHERE file_name = ?');
    const noteChunksCount = noteChunksCountStmt.pluck().get(fileName);
    console.log("noteChunksCountB: ", noteChunksCount);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }

  // STEP: update the virtual table
  const insertEmbeddingsIntoVSS = `
    INSERT INTO vss_note_chunks(rowid, embedding)
    SELECT rowid, embedding
    FROM note_chunks
    WHERE file_name = ?
  `;

  try {
    db.exec('BEGIN TRANSACTION');
    const insertEmbeddingsIntoVSSStmt = db.prepare(insertEmbeddingsIntoVSS);
    insertEmbeddingsIntoVSSStmt.run(fileName);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error(insertEmbeddingsIntoVSS, error);
    res.sendStatus(500);
  }

  try {
    const vssCountStmt = db.prepare('SELECT count(1) FROM vss_note_chunks');
    const vssCount = vssCountStmt.pluck().get();
    console.log("vssCount ", vssCount);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }

  console.log("Embedded: ", fileName);
  res.sendStatus(200);
});

// NOTE: this needs to async
app.post('/query', async (req, res) => {
  console.log('QUERY recieved: ', req.body);

  if (req.body.query === '') {
    res.status(200).json([]);
    return;
  }

  const joinedPath = path.join(
    req.body.vaultPath,
    req.body.dataStorePath,
    'semantic_search.db'
  );

  console.log('database path: ', joinedPath);

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
    INNER JOIN note_chunks ON note_chunks.rowid = matches.rowid;
  `;

  try {
    const vssCountStmt = db.prepare('SELECT count(1) FROM vss_note_chunks');
    const vssCount = vssCountStmt.pluck().get();
    console.log("vssCount ", vssCount);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }

  try {
    const searchResults = db.prepare(searchEmbeddings).all(
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
  console.log(`Server running on port ${PORT}`);
});