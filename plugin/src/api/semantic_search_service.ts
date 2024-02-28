import { Chunk, DbDetails, FileDetails, QueryDetails, EmbeddingParams } from 'src/interfaces';

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

interface EmbeddedFile {
    file_name: string;
}

export async function embeddedFiles(dbDetails: DbDetails) {
    try {
        const response = await fetch(new URL('http://localhost:3003/embedded_files'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dbDetails)
        });
        const responseJSON = await response.json();
        const fileNames = responseJSON.map((file: EmbeddedFile) => file.file_name);
        return fileNames;
    } catch (error) {
        console.error('Error getting embedded files: ', error, dbDetails);
    }
}

export async function resetEmbeddingIndex({ vaultPath: vaultPath, pluginPath: pluginPath }: DbDetails) {
    try {
        const response = await fetch(new URL('http://localhost:3003/reset'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(
                {
                    vaultPath: vaultPath,
                    pluginPath: pluginPath
                }
            )
        });
        console.log(response);
        return true;
    } catch(error) {
        console.error('Error resetting embedding index:', error);
    }
}

/**
 * Embeds a file by any deleting existing embedding,
 * creating a new embedding, and updating the virtual index.
 *
 * @param fileDetails - The details of the file to be embedded.
 * @returns A Promise that resolves when the embedding process is complete.
 */
export async function embedFile(file: FileDetails, embeddingParams: EmbeddingParams) {
    try {
        return await fetch(new URL('http://localhost:3003/embed_file'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...file, ...embeddingParams })
        });
    } catch (error) {
        console.error('Error embedding file:', error, file);
    }
}

export async function embedBatch(files: FileDetails[], embeddingParams: EmbeddingParams) {
    return await fetch(new URL('http://localhost:3003/embed_batch'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            files: files,
            ...embeddingParams
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
        console.error('Error updating embedding index:', error);
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

    if (response.ok) {
        const chunks = await response.json();
        return chunks;
    } else {
        return [];
    }
}