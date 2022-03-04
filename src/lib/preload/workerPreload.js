import log from 'electron-log'
import path from 'path'
import { ipcRenderer, contextBridge } from 'electron'
import { SqliteAdapter, HtmlCanvasAdapter, Context } from '@ngageoint/geopackage'
import { buildFeatureLayer } from '../geopackage/GeoPackageFeatureTableBuilder'
import { buildTileLayer } from '../geopackage/GeoPackageTileTableBuilder'
import { setSourceError } from '../vue/vuex/ProjectActions'
import { createUniqueID } from '../util/UniqueIDUtilities'
import { getWebMercatorBoundingBoxFromXYZ, tileIntersectsXYZ } from '../util/tile/TileBoundingBoxUtils'
import { convertToWebMercator, reprojectWebMercatorBoundingBox } from '../projection/ProjectionUtilities'
import { GET_USER_DATA_DIRECTORY, WORKER_BUILD_FEATURE_LAYER, WORKER_BUILD_FEATURE_LAYER_COMPLETED, WORKER_BUILD_FEATURE_LAYER_STATUS, WORKER_BUILD_TILE_LAYER, WORKER_BUILD_TILE_LAYER_COMPLETED, WORKER_BUILD_TILE_LAYER_STATUS, WORKER_READY } from '../electron/ipc/MapCacheIPC'
import {
  convertPbfToDataUrl,
} from '../util/rendering/MBTilesUtilities'
const getUserDataDirectory = () => {
  return ipcRenderer.sendSync(GET_USER_DATA_DIRECTORY)
}

log.transports.file.resolvePath = () => path.join(getUserDataDirectory(), 'logs', 'mapcache.log')
Object.assign(console, log.functions)
contextBridge.exposeInMainWorld('log', log.functions)

contextBridge.exposeInMainWorld('mapcache', {
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
