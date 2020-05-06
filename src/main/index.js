'use strict'

import { app, ipcMain } from 'electron'
import '../store'
import WindowLauncher from '../lib/window/WindowLauncher'
import WorkerPool from '../lib/window/WorkerWindowPool'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

app.on('ready', () => {
  WindowLauncher.launchLoaderWindow()
  WindowLauncher.launchMainWindow()
  WindowLauncher.launchProjectWindow()
  WorkerPool.launchWorkerWindows()
})
ipcMain.on('process_source', (event, payload) => {
  const id = payload.source.id
  WorkerPool.executeProcessSource(payload).then(function (result) {
    event.sender.send('process_source_completed_' + id, result)
  })
})
ipcMain.on('cancel_process_source', (event, payload) => {
  WorkerPool.cancelProcessSource(payload.id)
})
ipcMain.on('build_geopackage', (event, payload) => {
  const id = payload.geopackage.id
  WorkerPool.executeBuildGeoPackage(payload).then(function (result) {
    event.sender.send('build_geopackage_completed_' + id, result)
  })
})
ipcMain.on('cancel_geopackage_build', (event, payload) => {
  WorkerPool.cancelGeoPackageBuild(payload.geopackage)
})
ipcMain.on('quick_download_geopackage', (event, payload) => {
  WindowLauncher.downloadURL(payload.url)
})
app.on('window-all-closed', () => {
  WindowLauncher.launchMainWindow()
})
