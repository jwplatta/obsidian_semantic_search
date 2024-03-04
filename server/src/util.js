import fs from 'fs/promises'
import path from 'path'

export async function checkFileExists (filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch (error) {
    return false
  }
}

export function buildDbPath (reqBody) {
  return path.join(
    reqBody.pluginPath,
    'semantic_search.db' // TODO: make constant or move to settings in plugin
  )
}
