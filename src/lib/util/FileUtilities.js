import { readSync, mkdirSync, readdirSync, statSync, rmdirSync, existsSync, unlinkSync, readFileSync } from 'fs'
import path from 'path'
import isNil from 'lodash/isNil'
import UniqueIDUtilities from './UniqueIDUtilities'

export default class FileUtilities {
  static PROJECT_DIRECTORY_IDENTIFIER = 'p'
  static SOURCE_DIRECTORY_IDENTIFIER = 's'
  static BASEMAP_DIRECTORY_IDENTIFIER = 'b'
  static ICON_DIRECTORY_IDENTIFIER = 'i'
  static SUPPORTED_FILE_EXTENSIONS = ['tif', 'tiff', 'geotiff', 'kml', 'kmz', 'geojson', 'json', 'shp', 'zip', 'mbtiles']
  static SUPPORTED_FILE_EXTENSIONS_WITH_DOT = ['.tif', '.tiff', '.geotiff', '.kml', '.kmz', '.geojson', '.json', '.shp', '.zip', '.mbtiles']

  static getExtraResourcesDirectory () {
    let extraResourcesPath
    // eslint-disable-next-line no-undef
    if (!isNil(__static)) {
      // static only set in electron process
      // eslint-disable-next-line no-undef
      extraResourcesPath = path.join(path.dirname(__static), 'extraResources')
    } else {
      extraResourcesPath = path.join(path.dirname(__dirname), 'extraResources')
    }
    return extraResourcesPath
  }

  static getWorkerDirectory () {
    let workerPath
    // eslint-disable-next-line no-undef
    if (!isNil(__static)) {
      // static only set in electron process
      // eslint-disable-next-line no-undef
      workerPath = path.join(path.dirname(__static), 'dist_electron')
    } else {
      workerPath = path.join(path.dirname(__dirname), 'dist_electron')
    }
    return workerPath
  }

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
      readSync(fd, dataView, 0, chunkSize, start)
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to retrieve file slice.')
    }
    return dataView
  }

  /**
   * Creates a unique source directory in the directory provided
   * @returns {{sourceId: *, sourceDirectory: string}}
   */
  static createSourceDirectory (directory, id = UniqueIDUtilities.createUniqueID()) {
    const sourceDirectory = path.join(directory, id)
    mkdirSync(sourceDirectory)
    return { sourceId: id, sourceDirectory }
  }

  /**
   * Creates a directory
   * @param directory
   */
  static createDirectory (directory) {
    if (!existsSync(directory)) {
      mkdirSync(directory)
    }
  }

  static toHumanReadable (sizeInBytes) {
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024))
    return (sizeInBytes / Math.pow(1024, i)).toFixed(2) + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i]
  }

  static getFileSizeInBytes (filePath) {
    return statSync(filePath).size
  }

  static rmDir (dirPath) {
    if (!isNil(dirPath)) {
      let files
      try {
        files = readdirSync(dirPath)
      } catch (e) {
        return
      }
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          let filePath = path.join(dirPath, files[i])
          if (statSync(filePath).isFile()) {
            unlinkSync(filePath)
          } else {
            FileUtilities.rmDir(filePath)
          }
        }
      }
      rmdirSync(dirPath)
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
      result = statSync(filePath).mtime.toTimeString()
    } catch (error) {
      result = undefined
    }
    return result
  }

  static exists (filePath) {
    let result = false
    try {
      result = existsSync(filePath)
    } catch (error) {
      result = false
    }
    return result
  }

  /**
   * Sets up initial directories for app
   * @param userDataDirectory
   */
  static setupInitialDirectories (userDataDirectory) {
    if (existsSync(userDataDirectory)) {
      // ensure projects directory exists
      if (!existsSync(path.join(userDataDirectory, FileUtilities.PROJECT_DIRECTORY_IDENTIFIER))) {
        mkdirSync(path.join(userDataDirectory, FileUtilities.PROJECT_DIRECTORY_IDENTIFIER))
      }
      // ensure baseMaps directory exists
      if (!existsSync(path.join(userDataDirectory, FileUtilities.BASEMAP_DIRECTORY_IDENTIFIER))) {
        mkdirSync(path.join(userDataDirectory, FileUtilities.BASEMAP_DIRECTORY_IDENTIFIER))
      }
      // ensure icons directory exists
      if (!existsSync(path.join(userDataDirectory, FileUtilities.ICON_DIRECTORY_IDENTIFIER))) {
        mkdirSync(path.join(userDataDirectory, FileUtilities.ICON_DIRECTORY_IDENTIFIER))
      }
    }
  }

  static readJSONFile (path) {
    const content = readFileSync(path, 'utf8')
    return JSON.parse(content)
  }

  /**
   * Checks if a directory is empty, if it errors out because dir doesn't exist, it will still return isEmpty of true
   * @param dir
   * @returns {boolean}
   */
  static isDirEmpty(dir) {
    let isEmpty = true
    try {
      isEmpty = readdirSync(dir).length === 0
      // eslint-disable-next-line no-empty
    } catch (e) {}
    return isEmpty
  }
}
