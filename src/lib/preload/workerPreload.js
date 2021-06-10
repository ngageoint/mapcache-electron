import { ipcRenderer, contextBridge } from 'electron'
import { SqliteAdapter, HtmlCanvasAdapter, Context } from '@ngageoint/geopackage'
import GeoPackageFeatureTableBuilder from '../geopackage/GeoPackageFeatureTableBuilder'
import GeoPackageTileTableBuilder from '../geopackage/GeoPackageTileTableBuilder'
import log from 'electron-log'
import Store from 'electron-store'
import { tileIntersectsXYZ, getWebMercatorBoundingBoxFromXYZ } from '../util/TileBoundingBoxUtils'
import { setSourceError } from '../vue/vuex/ProjectActions'

Object.assign(console, log.functions)

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
  setupGeoPackgeContext: () => {
    Context.setupCustomContext(SqliteAdapter, HtmlCanvasAdapter)
  },
  getUserDataDirectory: () => {
    return ipcRenderer.sendSync('get-user-data-directory')
  },
  getAppDataDirectory: () => {
    return ipcRenderer.sendSync('get-app-data-directory')
  },
  removeListeners: () => {
    ipcRenderer.removeAllListeners('worker_build_feature_layer')
    ipcRenderer.removeAllListeners('worker_build_tile_layer')
  },
  addListeners: () => {
    ipcRenderer.on('worker_build_feature_layer', (e, data) => {
      const statusCallback = (status) => {
        ipcRenderer.send('worker_build_feature_layer_status_' + data.taskId, status)
      }
      GeoPackageFeatureTableBuilder.buildFeatureLayer(data.configuration, statusCallback).then((result) => {
        ipcRenderer.send('worker_build_feature_layer_completed_' + data.taskId, result)
      })
    })
    ipcRenderer.on('worker_build_tile_layer', (e, data) => {
      const statusCallback = (status) => {
        ipcRenderer.send('worker_build_tile_layer_status_' + data.taskId, status)
      }
      GeoPackageTileTableBuilder.buildTileLayer(data.configuration, statusCallback).then((result) => {
        ipcRenderer.send('worker_build_tile_layer_completed_' + data.taskId, result)
      })
    })
  },
  sendReady: () => {
    ipcRenderer.send('worker_ready')
  },
  tileIntersectsXYZ,
  getWebMercatorBoundingBoxFromXYZ,
  setSourceError
})
