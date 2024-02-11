import { Chunk } from 'src/chunk_interface';

// TODO: export class SemanticSearchService
async function post(url: URL, body: Object): Promise<Response>{
  return await fetch(url, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
}

async function get(url: URL) {
  return await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

/**
 * Embeds a file by sending its details to the server for embedding,
 * creating an embedding, and updating the index.
 *
 * @param fileDetails - The details of the file to be embedded.
 * @returns A Promise that resolves when the embedding process is complete.
 */
export async function embedFile(fileDetails: Object) {
  try {
    await post(new URL('http://localhost:3003/delete_embedding'), fileDetails);
    await post(new URL('http://localhost:3003/create_embedding'), fileDetails);
    await post(new URL('http://localhost:3003/update_index'), fileDetails);
  } catch (error) {
    console.error('Error embedding file:', error);
  }
}

/**
 * Checks if the server is available by sending a GET request to the specified URL.
 * @returns A Promise that resolves to a boolean indicating whether the server is available.
 */
export async function serverAvailable(): Promise<boolean> {
  return await get(new URL('http://localhost:3003/check_status'))
    .then((response) => {
      return true;
    }).catch(error => {
      console.error('Error checking server status: ', error);
      return false;
    });
}

/**
 * Configures the vector store by sending a POST request to the
 * specified URL with the provided database details.
 *
 * @param dbDetails - The details of the database to be configured.
 * @returns A promise that resolves to true if the configuration is
 * successful, or false if there is an error.
 */
export async function configureVectorStore(dbDetails: Object) {
  await post(new URL('http://localhost:3003/configure_db'), dbDetails)
    .then(response => {
      return true;
    }).catch(error => {
      console.error('Error configuring vector store: ', error);
      return false;
    });
}

/**
 * Queries the note chunks based on the provided query details.
 *
 * @param queryDetails - The details of the query.
 * @returns A promise that resolves to an array of Chunk objects if
 * the query is successful, otherwise an empty array.
 */
export async function queryNoteChunks(queryDetails: Object) : Promise<Chunk[] | []> {
  const response = await post(new URL('http://localhost:3003/query'), queryDetails);
  if (response.ok) {
    const chunks = await response.json();
    return chunks;
  } else {
    return [];
  }
}