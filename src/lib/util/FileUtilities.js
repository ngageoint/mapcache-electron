import fs from 'fs'
import path from 'path'
import isNil from 'lodash/isNil'
import UniqueIDUtilities from './UniqueIDUtilities'

export default class FileUtilities {
  static SUPPORTED_FILE_EXTENSIONS = ['tif', 'tiff', 'geotiff', 'kml', 'kmz', 'geojson', 'json', 'shp', 'zip', 'mbtiles']
  static SUPPORTED_FILE_EXTENSIONS_WITH_DOT = ['.tif', '.tiff', '.geotiff', '.kml', '.kmz', '.geojson', '.json', '.shp', '.zip', '.mbtiles']

  /**
   * Slices a chunk out of a file
   * @param fd
   * @param start
   * @param end
   * @returns {DataView}
   */
  static slice (fd, start, end) {
    const chunkSize = end - start
    const dataView = new DataView(new ArrayBuffer(chunkSize))
    try {
      fs.readSync(fd, dataView, 0, chunkSize, start)
    } catch (e) {
      console.error(e)
    }
    return dataView
  }

  /**
   * Creates a unique source directory in the directory provided
   * @returns {{sourceId: *, sourceDirectory: string}}
   */
  static createSourceDirectory (directory) {
    const sourceId = UniqueIDUtilities.createUniqueID()
    const sourceDirectory = path.join(directory, sourceId)
    fs.mkdirSync(sourceDirectory)
    return { sourceId, sourceDirectory }
  }

  static toHumanReadable (sizeInBytes) {
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024))
    return (sizeInBytes / Math.pow(1024, i)).toFixed(2) + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i]
  }

  static getFileSizeInBytes (filePath) {
    return fs.statSync(filePath).size
  }

  static rmDir (dirPath) {
    if (!isNil(dirPath)) {
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
  }

  /**
   * Get modified date for file
   * @param filePath
   * @returns {String}
   */
  static getLastModifiedDate (filePath) {
    let result
    try {
      result = fs.statSync(filePath).mtime.toTimeString()
    } catch (error) {
      result = undefined
    }
    return result
  }

  static exists (filePath) {
    let result = false
    try {
      result = fs.existsSync(filePath)
    } catch (error) {
      result = false
    }
    return result
  }
}
