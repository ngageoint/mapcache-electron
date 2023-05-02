import log from 'electron-log/renderer'
import { ipcRenderer, contextBridge } from 'electron'
import { SqliteAdapter, HtmlCanvasAdapter, Context } from '@ngageoint/geopackage'
import { buildFeatureLayer } from '../../lib/geopackage/GeoPackageFeatureTableBuilder'
import { buildTileLayer } from '../../lib/geopackage/GeoPackageTileTableBuilder'
import {
  GET_USER_DATA_DIRECTORY,
  WORKER_BUILD_FEATURE_LAYER,
  WORKER_BUILD_FEATURE_LAYER_COMPLETED,
  WORKER_BUILD_FEATURE_LAYER_STATUS,
  WORKER_BUILD_TILE_LAYER,
  WORKER_BUILD_TILE_LAYER_COMPLETED,
  WORKER_BUILD_TILE_LAYER_STATUS,
  WORKER_READY
} from '../lib/ipc/MapCacheIPC'

const getUserDataDirectory = () => {
  return ipcRenderer.sendSync(GET_USER_DATA_DIRECTORY)
}

Object.assign(console, log.functions)
contextBridge.exposeInMainWorld('log', log.functions)

contextBridge.exposeInMainWorld('mapcache', {
  setupGeoPackageContext: () => {
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
        ipcRenderer.send(WORKER_BUILD_FEATURE_LAYER_STATUS(data.taskId), { message, progress, error })
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
  }
})
