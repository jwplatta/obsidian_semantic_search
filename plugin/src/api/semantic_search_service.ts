import { Chunk, VectorStore, FileDetails, QueryDetails, EmbeddingParams } from 'src/interfaces';

/**
 * Retrieves the embeddings count from the server.
 *
 * @param vectorStore - The details of the database.
 * @returns A Promise that resolves to the embedding information.
 */
export async function embeddingsInfo(vectorStore: VectorStore) {
    try {
        const response = await fetch(new URL('http://localhost:3003/info'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vectorStore)
        });
        const info = await response.json();
        return info;
    } catch (error) {
        console.error('Error getting embedding info: ', error, vectorStore);
    }
}

interface EmbeddedFile {
    file_name: string;
}

/**
 * Retrieves the names of embedded files from the server.
 *
 * @param vectorStore - The details of the database.
 * @returns A Promise that resolves to an array of file names.
 */
export async function embeddedFiles(vectorStore: VectorStore) {
    try {
        const response = await fetch(new URL('http://localhost:3003/embedded_files'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vectorStore)
        });
        const responseJSON = await response.json();
        const fileNames = responseJSON.map((file: EmbeddedFile) => file.file_name);
        return fileNames;
    } catch (error) {
        console.error('Error getting embedded files: ', error, vectorStore);
    }
}

/**
 * Resets the embedding index by deleting the existing embeddings.
 *
 * @param vaultPath - The path of the vault.
 * @param pluginPath - The path of the plugin.
 * @returns A Promise that resolves to true when the reset process is complete.
 */
export async function resetEmbeddingIndex({ vaultPath, pluginPath }: VectorStore) {
    try {
        const response = await fetch(new URL('http://localhost:3003/reset'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vaultPath,
                pluginPath
            })
        });
        console.log(response);
        return true;
    } catch (error) {
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

/**
 * Embeds a batch of files by deleting existing embeddings and creating new embeddings.
 *
 * @param files - An array of file details to be embedded.
 * @param embeddingParams - The embedding parameters.
 * @returns A Promise that resolves when the embedding process is complete.
 */
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


/**
 * Updates the embedding index.
 *
 * @param vectorStore - The details of the database to be updated.
 * @returns A Promise that resolves when the update process is complete.
 */
export async function updateEmbeddingIndex(vectorStore: VectorStore) {
    try {
        return await fetch(new URL('http://localhost:3003/update_index'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vectorStore)
        });
    } catch (error) {
        console.error('Error updating embedding index:', error);
    }
}

/**
 * Checks if the server is available.
 *
 * @returns A Promise that resolves to a boolean indicating whether the server is available.
 */
export async function serverAvailable(): Promise<boolean> {
    return await fetch(new URL('http://localhost:3003/check_status'), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    }).then((response) => {
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
 * @param vectorStore - The details of the database to be configured.
 * @returns A promise that resolves to true if the configuration is
 * successful, or false if there is an error.
 */
export async function configureVectorStore(vectorStore: VectorStore) {
    return await fetch(new URL('http://localhost:3003/configure'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(vectorStore)
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