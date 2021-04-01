import { ipcRenderer } from 'electron'

// contextBridge.exposeInMainWorld ('mapcache', {
//   getAppVersion: () => app.getVersion(),
//   getUserDataDirectory: () => app.getPath('userData'),
//   showOpenDialog: (options) => {
//     return new Promise (resolve => {
//       ipcRenderer.once('show-open-dialog-completed', (result) => {
//         resolve(result)
//       })
//       ipcRenderer.send('show-open-dialog', options)
//     })
//   },
//   showSaveDialog: (options) => {
//     return new Promise (resolve => {
//       ipcRenderer.once('show-save-dialog-completed', (result) => {
//         resolve(result)
//       })
//       ipcRenderer.send('show-save-dialog', options)
//     })
//   }
// })

window.mapcache = {
  getUserDataDirectory: () => {
    return ipcRenderer.sendSync('get-user-data-directory')
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
      require('../lib/geopackage/GeoPackageFeatureTableBuilder').default.buildFeatureLayer(data.configuration, statusCallback).then(() => {
        ipcRenderer.send('worker_build_feature_layer_completed_' + data.taskId)
      })
    })
    ipcRenderer.on('worker_build_tile_layer', (e, data) => {
      console.log('build starting...')
      const statusCallback = (status) => {
        console.log('sending status')
        ipcRenderer.send('worker_build_tile_layer_status_' + data.taskId, status)
      }
      require('../lib/geopackage/GeoPackageTileTableBuilder').default.buildTileLayer(data.configuration, statusCallback).then(() => {
        console.log('build finished')
        ipcRenderer.send('worker_build_tile_layer_completed_' + data.taskId)
      })
    })
  },
  sendReady: () => {
    ipcRenderer.send('worker_ready')
  }
}
