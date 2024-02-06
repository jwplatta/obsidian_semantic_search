import Database from 'better-sqlite3';
import { pipeline } from '@xenova/transformers';
import * as sqlite_vss from "sqlite-vss";
import * as tf from '@tensorflow/tfjs-node';


async function getEmbedder() {
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  return embedder;
}

(async () => {
  const db = new Database('myDatabase.db');
  sqlite_vss.load(db);

  const version = db.prepare("SELECT vss_version();").pluck().get();
  console.log("vss_version: ", version);

  const createEmbeddingsTable = `
    CREATE TABLE IF NOT EXISTS text_chunks (
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
  CREATE VIRTUAL TABLE IF NOT EXISTS vss_text_chunks USING vss0(
    embedding(384)
  )
  `;
  try {
    db.prepare(createVirtualTable).run();
  } catch (error) {
    console.error(error);
  }

  const messages = [
    'hello world!',
    'how are you?',
    'I am doing well, thank you for asking.',
    'hello',
    'world'
  ];

  const embedder = await getEmbedder();

  for (const msgText of messages) {
    console.log(msgText);
    const embeddings = await embedder([msgText]);
    console.log(embeddings[0]);
    const meanTensor = tf.tensor(embeddings[0]['data']).reshape(embeddings[0]['dims']).mean(0);
    const stmt = db.prepare('INSERT INTO text_chunks (text_chunk, embedding) VALUES (?, ?)')
    const embeddingJSON = JSON.stringify(meanTensor.arraySync());
    stmt.run(msgText, embeddingJSON);
  }

  const insertEmbeddingsIntoVSS = `
    INSERT INTO vss_text_chunks(rowid, embedding)
    SELECT rowid, embedding
    FROM text_chunks;
  `;
  try {
    db.prepare(insertEmbeddingsIntoVSS).run();
  } catch (error) {
    console.error(error);
  }

  const searchEmbeddings = `
    WITH matches AS (
      SELECT
        rowid,
        distance
      FROM vss_text_chunks
      WHERE vss_search(
        embedding,
        (select embedding from text_chunks where rowid = 1)
      )
      limit 20
    )
    SELECT
      text_chunks.rowid,
      text_chunks.text_chunk,
      matches.distance
    FROM matches
    LEFT JOIN text_chunks on text_chunks.rowid = matches.rowid;
  `;

  const searchResults = db.prepare(searchEmbeddings).all();
  console.log(searchResults);

    // insert into vss_articles(rowid, headline_embedding, description_embedding)
    // select
    //   rowid,
    //   headline_embedding,
    //   description_embedding
    // from articles;

//   select rowid, distance
// from vss_articles
// where vss_search(
//   headline_embedding,
//   (select headline_embedding from articles where rowid = 123)
// )
// limit 100;

  // const stmt2 = db.prepare('SELECT rowid, embedding FROM text_chunk;');

})();
