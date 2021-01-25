'use strict'
import { app, protocol, globalShortcut } from 'electron'
import log from 'electron-log'
Object.assign(console, log.functions)
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import WindowLauncher from './lib/window/WindowLauncher'
const isDevelopment = process.env.NODE_ENV !== 'production'
import runMigration from './store/migration/migration'

app.allowRendererProcessReuse = false
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')
app.commandLine.appendSwitch('js-flags', '--expose_gc')

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function start() {
  // check if store is out of date, if so, delete content
  if (!await runMigration()) {
    app.quit()
    return
  }

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    WindowLauncher.showAllDevTools()
  })

  globalShortcut.register('CommandOrControl+Shift+H', () => {
    WindowLauncher.hideAllDevTools()
  })

  if (!process.env.WEBPACK_DEV_SERVER_URL) {
    createProtocol('app')
  }
  WindowLauncher.start()
  app.on('before-quit', () => {
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
