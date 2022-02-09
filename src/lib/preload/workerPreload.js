import log from 'electron-log'
import Store from 'electron-store'
import path from 'path'
import { ipcRenderer, contextBridge } from 'electron'
import { SqliteAdapter, HtmlCanvasAdapter, Context } from '@ngageoint/geopackage'
import { buildFeatureLayer } from '../geopackage/GeoPackageFeatureTableBuilder'
import { buildTileLayer } from '../geopackage/GeoPackageTileTableBuilder'
import { setSourceError } from '../vue/vuex/ProjectActions'
import { createUniqueID } from '../util/UniqueIDUtilities'
import { getWebMercatorBoundingBoxFromXYZ, tileIntersectsXYZ } from '../util/tile/TileBoundingBoxUtils'
import { convertToWebMercator, reprojectWebMercatorBoundingBox } from '../projection/ProjectionUtilities'
import { GET_USER_DATA_DIRECTORY, IPC_EVENT_CONNECT, IPC_EVENT_NOTIFY_MAIN, IPC_EVENT_NOTIFY_RENDERERS, WORKER_BUILD_FEATURE_LAYER, WORKER_BUILD_FEATURE_LAYER_COMPLETED, WORKER_BUILD_FEATURE_LAYER_STATUS, WORKER_BUILD_TILE_LAYER, WORKER_BUILD_TILE_LAYER_COMPLETED, WORKER_BUILD_TILE_LAYER_STATUS, WORKER_READY } from '../electron/ipc/MapCacheIPC'
import {
  convertPbfToDataUrl,
} from '../util/rendering/MBTilesUtilities'
const getUserDataDirectory = () => {
  return ipcRenderer.sendSync(GET_USER_DATA_DIRECTORY)
}

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
  setupGeoPackgeContext: () => {
    Context.setupCustomContext(SqliteAdapter, HtmlCanvasAdapter)
  },
  getUserDataDirectory,
  getAppDataDirectory: () => {
    return ipcRenderer.sendSync(GET_USER_DATA_DIRECTORY)
  },
  removeListeners: () => {
    ipcRenderer.removeAllListeners(WORKER_BUILD_FEATURE_LAYER)
    ipcRenderer.removeAllListeners(WORKER_BUILD_TILE_LAYER)
  },
  addListeners: () => {
    ipcRenderer.on(WORKER_BUILD_FEATURE_LAYER, (e, data) => {
      const statusCallback = (message, progress, error) => {
        ipcRenderer.send(WORKER_BUILD_FEATURE_LAYER_STATUS(data.taskId), {message, progress, error})
      }
      buildFeatureLayer(data.configuration, statusCallback).then((result) => {
        ipcRenderer.send(WORKER_BUILD_FEATURE_LAYER_COMPLETED(data.taskId), result)
      })
    })
    ipcRenderer.on(WORKER_BUILD_TILE_LAYER, (e, data) => {
      const statusCallback = (status) => {
        ipcRenderer.send(WORKER_BUILD_TILE_LAYER_STATUS(data.taskId), status)
      }
      buildTileLayer(data.configuration, statusCallback).then((result) => {
        ipcRenderer.send(WORKER_BUILD_TILE_LAYER_COMPLETED(data.taskId), result)
      })
    })
  },
  sendReady: () => {
    ipcRenderer.send(WORKER_READY)
  },
  createUniqueID,
  getWebMercatorBoundingBoxFromXYZ,
  tileIntersectsXYZ,
  reprojectWebMercatorBoundingBox,
  setSourceError,
  convertToWebMercator,
  convertPbfToDataUrl
})
