import { ipcRenderer } from 'electron'
import { SqliteAdapter, HtmlCanvasAdapter, Context } from '@ngageoint/geopackage'
import GeoPackageFeatureTableBuilder from '../geopackage/GeoPackageFeatureTableBuilder'
import GeoPackageTileTableBuilder from '../geopackage/GeoPackageTileTableBuilder'
import log from 'electron-log'
Object.assign(console, log.functions)

window.mapcache = {
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
      GeoPackageFeatureTableBuilder.buildFeatureLayer(data.configuration, statusCallback).then(() => {
        ipcRenderer.send('worker_build_feature_layer_completed_' + data.taskId)
      })
    })
    ipcRenderer.on('worker_build_tile_layer', (e, data) => {
      const statusCallback = (status) => {
        ipcRenderer.send('worker_build_tile_layer_status_' + data.taskId, status)
      }
      GeoPackageTileTableBuilder.buildTileLayer(data.configuration, statusCallback).then(() => {
        ipcRenderer.send('worker_build_tile_layer_completed_' + data.taskId)
      })
    })
  },
  sendReady: () => {
    ipcRenderer.send('worker_ready')
  }
}
