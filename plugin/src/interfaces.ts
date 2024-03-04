export interface Chunk {
  file_name: string;
  file_path: string;
  text_chunk: string;
}

export interface VectorStore {
  model: string;
  vaultPath: string;
  pluginPath: string;
}

export interface FileDetails {
  fileName: string;
  filePath: string;
}

export interface QueryDetails {
  model: string;
  vaultPath: string;
  pluginPath: string;
  query: string;
  searchResultsCount: number;
}

export interface EmbeddingParams {
  model: string;
  vaultPath: string;
  pluginPath: string;
  chunkSize: number;
}