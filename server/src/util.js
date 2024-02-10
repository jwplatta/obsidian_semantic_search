import fs from 'fs/promises';

export async function checkFileExists(filePath) {
  try {
      await fs.access(filePath);
      return true;
  } catch (error) {
      return false;
  }
}
