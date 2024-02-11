export const createEmbeddingsTable = `
  CREATE TABLE IF NOT EXISTS note_chunks (
    file_name VARCHAR(255),
    file_path TEXT,
    text_chunk TEXT,
    embedding BLOB
  )
`;

export const createVirtualTable = `
  CREATE VIRTUAL TABLE IF NOT EXISTS vss_note_chunks USING vss0(
    embedding(384)
  )
`;

export const insertEmbeddingsIntoVSS = `
  INSERT INTO vss_note_chunks(rowid, embedding)
  SELECT rowid, embedding
  FROM note_chunks
  WHERE file_name = ?
`;

export const insertNoteChunk = `
  INSERT INTO note_chunks (file_name, file_path, text_chunk, embedding)
  VALUES (?, ?, ?, ?)
`

export const deleteFromVss = `
  DELETE FROM vss_note_chunks
  WHERE rowid IN (
    SELECT rowid FROM note_chunks WHERE file_name = ?
  )
`

export const deleteFromNoteChunks = 'DELETE FROM note_chunks WHERE file_name = ?'

export const embeddingsQuery = `
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
  INNER JOIN note_chunks ON note_chunks.rowid = matches.rowid;`;