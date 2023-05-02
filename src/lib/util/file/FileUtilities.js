import { readSync, mkdirSync, readdirSync, statSync, rmSync, existsSync, rm, readFileSync } from 'fs'
import path from 'path'
import isNil from 'lodash/isNil'
import difference from 'lodash/difference'
import { createUniqueID } from '../UniqueIDUtilities'
import {
  PROJECT_DIRECTORY_IDENTIFIER,
  SOURCE_DIRECTORY_IDENTIFIER,
  LAYER_DIRECTORY_IDENTIFIER,
  BASEMAP_DIRECTORY_IDENTIFIER,
  ICON_DIRECTORY_IDENTIFIER,
} from './FileConstants'
import keys from 'lodash/keys'

function rmDir (dirPath) {
  rmSync(dirPath, {
    maxRetries: 5,
    recurisve: true
  })
}

function rmFile (filePath) {
  rmSync(filePath, {
    maxRetries: 5
  })
}

async function rmDirAsync (dirPath) {
  return new Promise(resolve => {
    rm(dirPath, {
      maxRetires: 5,
      recursive: true,
      force: true
    }, resolve)
  })
}

/**
 * Compares the user data directory to the vuex store's state and removes any unused project, basemap, source and layer directories
 * @param userDirectory
 * @param state
 * @returns any
 */
async function removeUnusedFromUserDirectory (userDirectory, state) {
  const projectDir = path.join(userDirectory, PROJECT_DIRECTORY_IDENTIFIER)
  const baseMapDir = path.join(userDirectory, BASEMAP_DIRECTORY_IDENTIFIER)

  const promises = []

  // delete unused base map directories
  const baseMapDirectories = readdirSync(baseMapDir).map(name => path.join(baseMapDir, name))
  const existingBaseMapDirectories = state.BaseMaps.baseMaps.filter(baseMap => ['0', '1', '2', '3'].indexOf(baseMap.id) === -1).map(baseMap => baseMap.directory)
  difference(baseMapDirectories, existingBaseMapDirectories).forEach(directory => {
    promises.push(rmDirAsync(directory))
  })

  // delete unused project directories
  const projectDirectories = readdirSync(projectDir).map(name => path.join(projectDir, name))
  const existingProjectDirectories = keys(state.Projects).map(projectId => state.Projects[projectId].directory)
  difference(projectDirectories, existingProjectDirectories).forEach(directory => {
    promises.push(rmDirAsync(directory))
  })

  // delete unused layer directories
  keys(state.Projects).forEach(projectId => {
    const project = state.Projects[projectId]
    const existingSourceDirectories = keys(project.sources).map(sourceId => project.sources[sourceId].sourceDirectory)
    const existingLayerDirectories = keys(project.sources).map(sourceId => project.sources[sourceId].directory)
    const sourcesDir = path.join(project.directory, SOURCE_DIRECTORY_IDENTIFIER)
    const sourceDirectories = readdirSync(sourcesDir).map(name => path.join(sourcesDir, name))

    difference(sourceDirectories, existingSourceDirectories).forEach(directory => {
      promises.push(rmDirAsync(directory))
    })

    const layerDirs = existingSourceDirectories.flatMap(sourceDir => {
      const layerDir = path.join(sourceDir, LAYER_DIRECTORY_IDENTIFIER)
      return readdirSync(layerDir).map(name => path.join(layerDir, name))
    })
    difference(layerDirs, existingLayerDirectories).map(directory => {
      promises.push(rmDirAsync(directory))
    })
  })

  return Promise.allSettled(promises)
}

/**
 * Clears out the project, basemap and icon directories
 * @param userDirectory
 * @returns result
 */
async function clearUserDirectory (userDirectory) {
  await Promise.allSettled([
    rmDirAsync(path.join(userDirectory, PROJECT_DIRECTORY_IDENTIFIER)),
    rmDirAsync(path.join(userDirectory, BASEMAP_DIRECTORY_IDENTIFIER)),
    rmDirAsync(path.join(userDirectory, ICON_DIRECTORY_IDENTIFIER)),
  ])
  setupInitialDirectories(userDirectory)
}

/**
 * ExtraResources is a directory that is used to include files that we do not wish to bundle but will access on the file system.
 * Electron Process: it can be found relative to the __directory
 * Node process: it is always one directory up from the __dirname
 * @returns {string}
 */
function getResourcesDirectory () {
  let extraResourcesPath
  // eslint-disable-next-line no-undef
  if (!isNil(process.env.NODE_ENV === 'development')) {
    // only set in electron process
    // eslint-disable-next-line no-undef
    extraResourcesPath = path.join(path.dirname(__dirname), 'resources')
  } else {
    extraResourcesPath = path.join(path.dirname(__dirname), 'resources')
  }
  return extraResourcesPath
}

function getWorkerDirectory () {
  let workerPath
  // eslint-disable-next-line no-undef
  if (!isNil(process.env.NODE_ENV === 'development')) {
    // only set in electron process
    // eslint-disable-next-line no-undef
    workerPath = path.join(path.dirname(__dirname), '..', 'dist_electron')
  } else {
    workerPath = path.join(path.dirname(__dirname), 'dist_electron')
  }
  return workerPath
}

/**
 * Creates the next available project directory and necessary subdirectories
 * @param userDataDir
 * @param create
 * @returns {String}
 */
function createNextAvailableProjectDirectory (userDataDir, create = true) {
  let projectDirectory = null
  let nextDirectory = 0
  const projectsDirectory = path.join(userDataDir, PROJECT_DIRECTORY_IDENTIFIER)
  let projectDirectories = readdirSync(projectsDirectory)
  while (isNil(projectDirectory) && existsSync(projectsDirectory)) {
    if (projectDirectories.indexOf(nextDirectory.toString()) === -1) {
      projectDirectory = path.join(projectsDirectory, nextDirectory.toString())
      if (create) {
        try {
          mkdirSync(projectDirectory)
          mkdirSync(path.join(projectDirectory, SOURCE_DIRECTORY_IDENTIFIER))
        } catch (e) {
          projectDirectories = readdirSync(projectsDirectory)
          projectDirectory = null
          nextDirectory++
        }
      } else {
        if (existsSync(projectDirectory)) {
          projectDirectories = readdirSync(projectsDirectory)
          projectDirectory = null
          nextDirectory++
        }
      }
    } else {
      nextDirectory++
    }
  }
  return projectDirectory
}

/**
 * Creates the next available baseMap directory
 * @param userDataDir
 * @param create
 * @returns {String}
 */
function createNextAvailableBaseMapDirectory (userDataDir, create = true) {
  let baseMapDirectory = null
  let nextDirectory = 0
  const baseMapsDirectory = path.join(userDataDir, BASEMAP_DIRECTORY_IDENTIFIER)
  let baseMapDirectories = readdirSync(baseMapsDirectory)
  while (isNil(baseMapDirectory) && existsSync(baseMapsDirectory)) {
    if (baseMapDirectories.indexOf(nextDirectory.toString()) === -1) {
      baseMapDirectory = path.join(baseMapsDirectory, nextDirectory.toString())
      if (create) {
        try {
          mkdirSync(baseMapDirectory)
        } catch (e) {
          baseMapDirectories = readdirSync(baseMapsDirectory)
          baseMapDirectory = null
          nextDirectory++
        }
      } else {
        if (existsSync(baseMapDirectory)) {
          baseMapDirectories = readdirSync(baseMapsDirectory)
          baseMapDirectory = null
          nextDirectory++
        }
      }
    } else {
      nextDirectory++
    }
  }
  return baseMapDirectory
}

/**
 * Creates the next available source directory and necessary subdirectories
 * @param projectDirectory
 * @param create
 * @returns {*|string}
 */
function createNextAvailableSourceDirectory (projectDirectory, create = true) {
  let sourceDirectory = null
  let nextDirectory = 0
  const sourcesDirectory = path.join(projectDirectory, SOURCE_DIRECTORY_IDENTIFIER)
  let sourceDirectories = readdirSync(sourcesDirectory)
  while (isNil(sourceDirectory) && existsSync(sourcesDirectory)) {
    if (sourceDirectories.indexOf(nextDirectory.toString()) === -1) {
      sourceDirectory = path.join(sourcesDirectory, nextDirectory.toString())
      if (create) {
        try {
          mkdirSync(sourceDirectory)
          mkdirSync(path.join(sourceDirectory, LAYER_DIRECTORY_IDENTIFIER))
        } catch (e) {
          sourceDirectories = readdirSync(sourcesDirectory)
          sourceDirectory = null
          nextDirectory++
        }
      } else {
        if (existsSync(sourceDirectory)) {
          sourceDirectories = readdirSync(sourcesDirectory)
          sourceDirectory = null
          nextDirectory++
        }
      }
    } else {
      nextDirectory++
    }
  }
  return sourceDirectory
}

/**
 * Creates the next available layer directory
 * @param sourceDirectory
 * @param create
 * @returns {*|string}
 */
function createNextAvailableLayerDirectory (sourceDirectory, create = true) {
  let layerDirectory = null
  let nextDirectory = 0
  const layersDirectory = path.join(sourceDirectory, LAYER_DIRECTORY_IDENTIFIER)
  let layerDirectories = readdirSync(layersDirectory)
  while (isNil(layerDirectory) && existsSync(layersDirectory)) {
    if (layerDirectories.indexOf(nextDirectory.toString()) === -1) {
      layerDirectory = path.join(layersDirectory, nextDirectory.toString())
      if (create) {
        try {
          mkdirSync(layerDirectory)
        } catch (e) {
          layerDirectories = readdirSync(layersDirectory)
          layerDirectory = null
          nextDirectory++
        }
      } else {
        if (existsSync(layerDirectory)) {
          layerDirectories = readdirSync(layersDirectory)
          layerDirectory = null
          nextDirectory++
        }
      }
    } else {
      nextDirectory++
    }
  }
  return layerDirectory
}

/**
 * Slices a chunk out of a file
 * @param fd
 * @param start
 * @param end
 * @returns {DataView}
 */
function slice (fd, start, end) {
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
function createSourceDirectory (directory, id = createUniqueID()) {
  const sourceDirectory = path.join(directory, id)
  mkdirSync(sourceDirectory)
  return { sourceId: id, sourceDirectory }
}

/**
 * Creates a directory
 * @param directory
 */
function createDirectory (directory) {
  if (!existsSync(directory)) {
    mkdirSync(directory)
  }
}

function toHumanReadable (sizeInBytes) {
  const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024))
  return (sizeInBytes / Math.pow(1024, i)).toFixed(1) + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i]
}

function getFileSizeInBytes (filePath) {
  return statSync(filePath).size
}

/**
 * Get modified date for file
 * @param filePath
 * @returns {String}
 */
function getLastModifiedDate (filePath) {
  let result
  try {
    result = statSync(filePath).mtime.toTimeString()
  } catch (error) {
    result = undefined
  }
  return result
}

function exists (filePath) {
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
function setupInitialDirectories (userDataDirectory) {
  if (existsSync(userDataDirectory)) {
    // ensure projects directory exists
    if (!existsSync(path.join(userDataDirectory, PROJECT_DIRECTORY_IDENTIFIER))) {
      mkdirSync(path.join(userDataDirectory, PROJECT_DIRECTORY_IDENTIFIER))
    }
    // ensure baseMaps directory exists
    if (!existsSync(path.join(userDataDirectory, BASEMAP_DIRECTORY_IDENTIFIER))) {
      mkdirSync(path.join(userDataDirectory, BASEMAP_DIRECTORY_IDENTIFIER))
    }
    // ensure icons directory exists
    if (!existsSync(path.join(userDataDirectory, ICON_DIRECTORY_IDENTIFIER))) {
      mkdirSync(path.join(userDataDirectory, ICON_DIRECTORY_IDENTIFIER))
    }
  }
}

function readJSONFile (path) {
  const content = readFileSync(path, 'utf8')
  return JSON.parse(content)
}

function readFile (path) {
  return readFileSync(path, 'utf8')
}

/**
 * Checks if a directory is empty, if it errors out because dir doesn't exist, it will still return isEmpty of true
 * @param dir
 * @returns {boolean}
 */
function isDirEmpty (dir) {
  let isEmpty = true
  try {
    isEmpty = readdirSync(dir).length === 0
    // eslint-disable-next-line no-empty
  } catch (e) {
  }
  return isEmpty
}


export {
  getResourcesDirectory,
  getWorkerDirectory,
  createNextAvailableProjectDirectory,
  createNextAvailableBaseMapDirectory,
  createNextAvailableSourceDirectory,
  createNextAvailableLayerDirectory,
  slice,
  createSourceDirectory,
  createDirectory,
  toHumanReadable,
  getFileSizeInBytes,
  rmDir,
  rmDirAsync,
  getLastModifiedDate,
  exists,
  setupInitialDirectories,
  readJSONFile,
  readFile,
  isDirEmpty,
  removeUnusedFromUserDirectory,
  clearUserDirectory,
  rmFile
}
