'use strict'
import { app, protocol, globalShortcut } from 'electron'
import log from 'electron-log'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import runMigration from './store/migration/migration'
import MapCacheWindowManager from './lib/electron/MapCacheWindowManager'

const isDevelopment = process.env.NODE_ENV !== 'production'
Object.assign(console, log.functions)

let readyToQuit = false

app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')
app.commandLine.appendSwitch('js-flags', '--expose_gc')

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

function setupEventHandlers () {
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
    process.on('SIGINT', () => {
      app.quit()
    })
    process.on('SIGABRT', () => {
      app.quit()
    })
    process.on('SIGSEGV', () => {
      app.quit()
    })
  }
}

async function start() {
  // check if store is out of date, if so, delete content
  if (!await runMigration()) {
    app.quit()
    return
  }

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    MapCacheWindowManager.showAllDevTools()
  })

  globalShortcut.register('CommandOrControl+Shift+H', () => {
    MapCacheWindowManager.hideAllDevTools()
  })

  setupEventHandlers ()

  if (!process.env.WEBPACK_DEV_SERVER_URL) {
    createProtocol('app')
  }

  MapCacheWindowManager.start()
}

// Quit when all windows are closed.
app.once('window-all-closed', () => {
  app.quit()
})


app.on('before-quit', ((event) => {
  if (!readyToQuit) {
    event.preventDefault()
    MapCacheWindowManager.quit().then(() => {
      readyToQuit = true
      app.quit()
    })
  }
}))

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!MapCacheWindowManager.isAppRunning()) {
    start()
  }
})

app.once('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    try {
      const { default: installExtension, VUEJS_DEVTOOLS } = require('electron-devtools-installer')
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  start()
})
