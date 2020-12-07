'use strict'
import { app, protocol, ipcMain } from 'electron'
import log from 'electron-log'
Object.assign(console, log.functions)
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import WindowLauncher from './lib/window/WindowLauncher'
import WorkerPool from './lib/window/WorkerWindowPool'
import './store'
const isDevelopment = process.env.NODE_ENV !== 'production'

app.allowRendererProcessReuse = false
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function start() {
  if (!process.env.WEBPACK_DEV_SERVER_URL) {
    createProtocol('app')
  }
  WindowLauncher.launchLoaderWindow()
  WindowLauncher.launchMainWindow()
  WindowLauncher.launchProjectWindow()
  WorkerPool.launchWorkerWindows()
  ipcMain.on('process_source', (event, payload) => {
    const id = payload.source.id
    WorkerPool.executeProcessSource(payload).then(function (result) {
      event.sender.send('process_source_completed_' + id, result)
    }).catch(e => {
      // eslint-disable-next-line no-console
      console.error(e)
    })
  })
  ipcMain.on('show-project', (event, payload) => {
    WindowLauncher.showProject(payload)
  })
  ipcMain.on('close-project', () => {
    WindowLauncher.closeProject()
  })
  ipcMain.on('show_feature_table', (event, id, tableName, isGeoPackage) => {
    event.sender.send('show_feature_table', id, tableName, isGeoPackage)
  })
  ipcMain.on('cancel_process_source', (event, payload) => {
    WorkerPool.cancelProcessSource(payload.id).then(() => {
      event.sender.send('cancel_process_source_completed_' + payload.id)
    })
  })
  ipcMain.on('build_feature_layer', (event, payload) => {
    try {
      const id = payload.configuration.id
      const statusCallback = (status) => {
        event.sender.send('build_feature_layer_status_' + id, status)
      }
      WorkerPool.executeBuildFeatureLayer(payload, statusCallback).then(function (result) {
        event.sender.send('build_feature_layer_completed_' + id, result)
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  })
  ipcMain.on('cancel_build_feature_layer', (event, payload) => {
    try {
      WorkerPool.cancelBuildFeatureLayer(payload).then(function () {
        event.sender.send('cancel_build_feature_layer_completed_' + payload.configuration.id)
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  })
  ipcMain.on('build_tile_layer', (event, payload) => {
    try {
      const id = payload.configuration.id
      const statusCallback = (status) => {
        event.sender.send('build_tile_layer_status_' + id, status)
      }
      WorkerPool.executeBuildTileLayer(payload, statusCallback).then(function (result) {
        event.sender.send('build_tile_layer_completed_' + id, result)
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  })
  ipcMain.on('cancel_build_tile_layer', (event, payload) => {
    try {
      WorkerPool.cancelBuildTileLayer(payload).then(function () {
        event.sender.send('cancel_build_tile_layer_completed_' + payload.configuration.id)
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  })
  ipcMain.on('quick_download_geopackage', (event, payload) => {
    WindowLauncher.downloadURL(payload.url)
  })
  ipcMain.on('read_raster', (event, payload) => {
    try {
      WorkerPool.readRaster(payload).then(function (result) {
        event.sender.send('read_raster_completed_' + payload.id, { rasters: result })
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  })
  app.on('before-quit', () => {
    WorkerPool.quit()
    WindowLauncher.quit()
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!WindowLauncher.isWindowVisible()) {
    start()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  start()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
