import log from 'electron-log'
import Store from 'electron-store'
import path from 'path'
import { contextBridge, ipcRenderer } from 'electron'
import { deleteProject } from '../vue/vuex/CommonActions'
import {addGeoPackage, disableRemoteSources, newProject, setProjectAccessed} from '../vue/vuex/LandingActions'
import { createNextAvailableProjectDirectory } from '../util/file/FileUtilities'
import { createUniqueID } from '../util/UniqueIDUtilities'
import {
  GET_APP_VERSION,
  GET_USER_DATA_DIRECTORY,
  IPC_EVENT_CONNECT,
  IPC_EVENT_NOTIFY_MAIN,
  IPC_EVENT_NOTIFY_RENDERERS,
  LAUNCH_WITH_GEOPACKAGE_FILES,
  OPEN_EXTERNAL,
  SHOW_PROJECT
} from '../electron/ipc/MapCacheIPC'
import { Context, HtmlCanvasAdapter, SqliteAdapter } from '@ngageoint/geopackage'

const getUserDataDirectory = () => {
  return ipcRenderer.sendSync(GET_USER_DATA_DIRECTORY)
}

const allowedOpenExternalLinks = ['http://www.geopackage.org/', 'http://ngageoint.github.io/GeoPackage/', 'https://eventkit.gs.mil/']

log.transports.file.resolvePath = () => path.join(getUserDataDirectory(), 'logs', 'mapcache.log')
Object.assign(console, log.functions)
contextBridge.exposeInMainWorld('log', log.functions)

let storage

contextBridge.exposeInMainWorld('mapcache', {
  connect(payload) {
    ipcRenderer.send(IPC_EVENT_CONNECT, payload)
  },
  notifyMain(payload) {
    ipcRenderer.send(IPC_EVENT_NOTIFY_MAIN, payload)
  },
  onNotifyRenderers(handler) {
    ipcRenderer.on(IPC_EVENT_NOTIFY_RENDERERS, handler)
  },
  createStorage(name) {
    storage = new Store({ name: name })
  },
  getState(key) {
    return storage.get(key)
  },
  setState(key, state) {
    storage.set(key, state)
  },
  checkStorage(testKey) {
    try {
      storage.set(testKey, testKey)
      storage.get(testKey)
      storage.delete(testKey)
    } catch (error) {
      throw new Error("[Vuex Electron] Storage is not valid. Please, read the docs.")
    }
  },
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
  setupGeoPackgeContext: () => {
    Context.setupCustomContext(SqliteAdapter, HtmlCanvasAdapter)
  },
  showProject: (projectId, geopackageIds, filePaths) => {
    setProjectAccessed(projectId)
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
  disableRemoteSources,
  newProject,
  deleteProject,
  createUniqueID,
  addGeoPackage,
})
