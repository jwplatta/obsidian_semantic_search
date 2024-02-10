import { Chunk } from 'src/chunk_interface';

// TODO: export class SemanticSearchService
async function postServer(url: URL, body: Object): Promise<Response>{
  return await fetch(url, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
}

async function getServer(url: URL) {
  return await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

export async function embedFile(fileDetails: Object) {
  try {
    await postServer(new URL('http://localhost:3003/delete_embedding'), fileDetails);
    await postServer(new URL('http://localhost:3003/create_embedding'), fileDetails);
    await postServer(new URL('http://localhost:3003/update_index'), fileDetails);
  } catch (error) {
    console.error('Error embedding file:', error);
  }
}

export async function serverAvailable(): Promise<boolean> {
  return await getServer(new URL('http://localhost:3003/check_status'))
    .then(response => {
      console.log('Server status: ', response);
      return true;
    }).catch(error => {
      console.error('Server error: ', error);
      return false;
    });
}

export async function configureVectorStore(dbDetails: Object) {
  await postServer(new URL('http://localhost:3003/configure_db'), dbDetails).then(response => {
    console.log('Vector store configured:', response);
    return true;
  }).catch(error => {
    console.error('Error configuring vector store:', error);
    return false;
  });
}

export async function queryNoteChunks(queryDetails: Object) : Promise<Chunk[] | []> {
  const response = await postServer(new URL('http://localhost:3003/query'), queryDetails);
  if (response.ok) {
    const chunks = await response.json();
    return chunks;
  } else {
    return [];
  }
}