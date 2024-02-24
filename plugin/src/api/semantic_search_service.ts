import { Chunk } from 'src/chunk_interface';
import { DbDetails } from 'src/db_details_interface';
import { FileDetails } from 'src/file_details_interface';
import { QueryDetails } from 'src/query_details_interface';


async function get(url: URL) {
    return await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });
}

export async function embeddingsInfo(dbDetails: DbDetails) {
    try {
        const response = await fetch(new URL('http://localhost:3003/info'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dbDetails)
        });
        const info = await response.json();
        return info;
    } catch (error) {
        console.error('Error getting embedding info: ', error, dbDetails);
    }
}

/**
 * Embeds a file by any deleting existing embedding,
 * creating a new embedding, and updating the virtual index.
 *
 * @param fileDetails - The details of the file to be embedded.
 * @returns A Promise that resolves when the embedding process is complete.
 */
export async function embedFile(file: FileDetails) {
    try {
        return await fetch(new URL('http://localhost:3003/embed_file'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(file)
        });
    } catch (error) {
        console.error('Error embedding file:', error, file);
    }
}

export async function embedBatch(files: FileDetails[], embeddingModel: string, vaultPath: string, pluginPath: string, chunkSize: number) {
    return await fetch(new URL('http://localhost:3003/embed_batch'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: embeddingModel,
            vaultPath: vaultPath,
            pluginPath: pluginPath,
            chunkSize: chunkSize,
            files: files
        })
    });
}

export async function updateEmbeddingIndex(dbDetails: DbDetails) {
    try {
        return await fetch(new URL('http://localhost:3003/update_index'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dbDetails)
        });
    } catch (error) {
        console.error('Error updating embedding index:', error, dbDetails);
    }
}

/**
 * Checks if the server is available.
 * @returns A Promise that resolves to a boolean indicating whether the server is available.
 */
export async function serverAvailable(): Promise<boolean> {
    return await get(new URL('http://localhost:3003/check_status'))
        .then((response) => {
            if (!response.ok) {
                return false;
            }
            return true;
        }).catch(error => {
            console.error('Error checking server status: ', error);
            return false;
        });
}

/**
 * Configures the vector store with the provided database details.
 *
 * @param dbDetails - The details of the database to be configured.
 * @returns A promise that resolves to true if the configuration is
 * successful, or false if there is an error.
 */
export async function configureVectorStore(dbDetails: DbDetails) {
    return await fetch(new URL('http://localhost:3003/configure_db'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dbDetails)
    }).then(response => {
        if (!response.ok) {
            return false;
        }
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
export async function queryNoteChunks(queryDetails: QueryDetails): Promise<Chunk[] | []> {
    const response = await fetch(new URL('http://localhost:3003/query'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryDetails)
    });

    console.log(response);

    if (response.ok) {
        const chunks = await response.json();
        return chunks;
    } else {
        return [];
    }
}