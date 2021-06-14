import {contextBridge, ipcRenderer} from 'electron'
import log from 'electron-log'
import Store from 'electron-store'
import { deleteProject } from '../vue/vuex/CommonActions'
import { disableRemoteSources, newProject } from '../vue/vuex/LandingActions'
import { createNextAvailableProjectDirectory } from '../util/FileUtilities'
import { createUniqueID } from '../util/UniqueIDUtilities'
import path from 'path'

const getUserDataDirectory = () => {
  return ipcRenderer.sendSync('get-user-data-directory')
}

log.transports.file.resolvePath = () => path.join(getUserDataDirectory(), 'logs', 'mapcache.log')
Object.assign(console, log.functions)
contextBridge.exposeInMainWorld('log', log.functions)

const IPC_EVENT_CONNECT = 'vuex-mutations-connect'
const IPC_EVENT_NOTIFY_MAIN = 'vuex-mutations-notify-main'
const IPC_EVENT_NOTIFY_RENDERERS = 'vuex-mutations-notify-renderers'

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
    return ipcRenderer.sendSync('get-app-data-directory')
  },
  getAppVersion: () => {
    return ipcRenderer.sendSync('get-app-version')
  },
  openExternal: (link) => {
    ipcRenderer.send('open-external', link)
  },
  showProject: (id) => {
    ipcRenderer.send('show-project', id)
  },
  onceProjectShown: (callback) => {
    ipcRenderer.once('show-project-completed', callback)
  },
  createProjectDirectory: () => {
    return createNextAvailableProjectDirectory(getUserDataDirectory())
  },
  disableRemoteSources,
  newProject,
  deleteProject,
  createUniqueID
})
