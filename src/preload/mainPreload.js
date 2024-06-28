import { contextBridge, ipcRenderer } from 'electron'
import log from 'electron-log/renderer'
import path from 'path'
import { deleteProjectFolder } from '../lib/vue/vuex/CommonPreloadFunctions'
import { createNextAvailableLayerDirectory, createNextAvailableProjectDirectory, createNextAvailableSourceDirectory } from '../lib/util/file/FileUtilities'
import { createUniqueID } from '../lib/util/UniqueIDUtilities'
import { GET_APP_VERSION, GET_USER_DATA_DIRECTORY, LAUNCH_WITH_GEOPACKAGE_FILES, OPEN_EXTERNAL, SHOW_PROJECT } from '../main/lib/ipc/MapCacheIPC'
import { Context, HtmlCanvasAdapter, SqliteAdapter } from '@ngageoint/geopackage'
import { environment } from '../lib/env/env'
import { vuexElectronAPI } from './vuexPreload'
import { getOrCreateGeoPackageForApp } from '../lib/geopackage/GeoPackageCommon'

const getUserDataDirectory = () => {
  return ipcRenderer.sendSync(GET_USER_DATA_DIRECTORY)
}

const allowedOpenExternalLinks = []
if (environment.geopackageUrl != null) {
  allowedOpenExternalLinks.push(environment.geopackageUrl)
}
if (environment.geopackageLibrariesUrl != null) {
  allowedOpenExternalLinks.push(environment.geopackageLibrariesUrl)
}
if (environment.eventkitUrl != null) {
  allowedOpenExternalLinks.push(environment.eventkitUrl)
}

// utilize the log functions
Object.assign(console, log.functions)
contextBridge.exposeInMainWorld('log', log.functions)
contextBridge.exposeInMainWorld('vuex', vuexElectronAPI)
contextBridge.exposeInMainWorld('mapcache', {
  getUserDataDirectory,
  getAppDataDirectory: () => {
    return ipcRenderer.sendSync(GET_USER_DATA_DIRECTORY)
  },
  getAppVersion: () => {
    return ipcRenderer.sendSync(GET_APP_VERSION)
  },
  openExternal: (link) => {
    if (allowedOpenExternalLinks.indexOf(link) !== -1) {
      ipcRenderer.send(OPEN_EXTERNAL, link)
    }
  },
  setupGeoPackageContext: () => {
    Context.setupCustomContext(SqliteAdapter, HtmlCanvasAdapter)
  },
  showProject: (projectId, geopackageIds, filePaths) => {
    ipcRenderer.send(SHOW_PROJECT, projectId, geopackageIds, filePaths)
  },
  registerGeoPackageFileHandler: (callback) => {
    ipcRenderer.on(LAUNCH_WITH_GEOPACKAGE_FILES, (e, filePaths) => callback(filePaths))
  },
  unregisterGeoPackageFileHandler: () => {
    ipcRenderer.removeAllListeners(LAUNCH_WITH_GEOPACKAGE_FILES)
  },
  createProjectDirectory: () => {
    return createNextAvailableProjectDirectory(getUserDataDirectory())
  },
  getBaseName: (filePath) => {
    return path.basename(filePath)
  },
  createSourceDirectory: (projectDirectory) => {
    return createNextAvailableSourceDirectory(projectDirectory)
  },
  createNextAvailableLayerDirectory,
  createUniqueID,
  deleteProjectFolder,
  getOrCreateGeoPackageForApp
})
