import fs from 'fs/promises';
import path from 'path';

export async function checkFileExists(filePath) {
  try {
      await fs.access(filePath);
      return true;
  } catch (error) {
      return false;
  }
}

export function buildDbPath(reqBody) {
  try {
    if (process.env.NODE_ENV === 'docker') {
      return path.join("/usr/src/server", reqBody.dataStoreFilename);
    } else {
      return path.join(
        reqBody.vaultPath,
        reqBody.dataStorePath,
        reqBody.dataStoreFilename
      );
    }
  } catch (error) {
    throw new Error("Error building db path: ", error);
  }
}