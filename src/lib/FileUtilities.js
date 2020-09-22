import fs from 'fs'
import path from 'path'
import { userDataDir } from './settings/Settings'
import UniqueIDUtilities from './UniqueIDUtilities'

export default class FileUtilities {
  static toHumanReadable (sizeInBytes) {
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024))
    return (sizeInBytes / Math.pow(1024, i)).toFixed(2) + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i]
  }

  // removes a source directory by the source Id
  static rmSourceDirectory (sourceId) {
    const sourceDirectory = userDataDir().dir(sourceId).path()
    if (fs.existsSync(sourceDirectory)) {
      try {
        FileUtilities.rmDir(sourceDirectory)
      } catch (error) {
        console.error(error)
      }
    }
  }

  static rmDir (dirPath) {
    let files
    try {
      files = fs.readdirSync(dirPath)
    } catch (e) {
      return
    }
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        let filePath = path.join(dirPath, files[i])
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath)
        } else {
          FileUtilities.rmDir(filePath)
        }
      }
    }
    fs.rmdirSync(dirPath)
  }

  /**
   * Creates a unique source directory in the user data dir directory
   * @returns {{sourceId: *, sourceDirectory: string}}
   */
  static createSourceDirectory () {
    const sourceId = UniqueIDUtilities.createUniqueID()
    const sourceDirectory = userDataDir().dir(sourceId).path()
    return { sourceId, sourceDirectory }
  }
}
