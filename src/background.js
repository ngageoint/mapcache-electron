'use strict'
import { app, protocol } from 'electron'
import path from 'path'
import MapCacheWindowManager from './lib/electron/MapCacheWindowManager'

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.error('MapCache is already running.')
  app.quit()
} else {
  app.commandLine.appendSwitch('js-flags', '--expose_gc')

// Scheme must be registered before the app is ready
  protocol.registerSchemesAsPrivileged([
    { scheme: 'mapcache', privileges: { secure: true, standard: true } }
  ])

  const isProduction = process.env.NODE_ENV === 'production'

  let readyToQuit = false

  /**
   * Sets up the electron-log library. This will write logs to a file.
   */
  function setupElectronLog () {
    const log = require('electron-log')
    log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs', 'mapcache.log')
    Object.assign(console, log.functions)
  }

  /**
   * Sets up handlers for various kill signals
   */
  function setupEventHandlers () {
    if (process.platform === 'win32') {
      process.on('message', (data) => {
        if (data === 'graceful-exit') {
          app.quit()
        }
      })
    } else {
      const quitFunction = () => {
        app.quit()
      }
      process.on('SIGTERM', quitFunction)
      process.on('SIGINT', quitFunction)
      process.on('SIGABRT', quitFunction)
      process.on('SIGSEGV', quitFunction)
    }
  }

  /**
   * WebContent handling per Electron security recommendations
   * Only allow navigation to the pages listed below
   */
  function setupWebContentHandling () {
    app.on('web-contents-created', (event, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http://localhost') ||
          url.startsWith('mapcache://') ||
          url.startsWith('http://www.geopackage.org') ||
          url.startsWith('https://github.com/ngageoint') ||
          url.startsWith('http://ngageoint.github.io') ||
          url.startsWith('https://eventkit.gs.mil')) {
          return { action: 'allow' }
        }
        return { action: 'deny' }
      })
    })
    app.on('web-contents-created', (event, contents) => {
      // do not allow web views to be attached, mapcache should not request any web views
      contents.on('will-attach-webview', (event) => {
        event.preventDefault()
      })
    })
  }

  /**
   * Will run migration, setup directory structure, event handlers, electron log, create the app protocol and then launch the
   * landing page.
   * @returns {Promise<void>}
   */
  async function start() {
    setupElectronLog()
    setupEventHandlers()
    setupWebContentHandling()

    if (!process.env.WEBPACK_DEV_SERVER_URL) {
      require('./lib/protocol/protocol').default('mapcache')
    }

    MapCacheWindowManager.launchLoaderWindow()

    const { runMigration } = require('./store/migration/migration')
    // check if store is out of date, if so, delete content
    try {
      if (!await runMigration()) {
        console.error('Migration failed. Forcing reset.')
        if (!await runMigration(true)) {
          console.error('Reset failed. Contact administrator.')
          app.quit()
          return
        }
      }
    } catch (e) {
      app.quit();
    }

    const { setupInitialDirectories } = require('./lib/util/FileUtilities')
    setupInitialDirectories(app.getPath('userData'))

    MapCacheWindowManager.start()
  }

  /**
   * once window-all-closed is fired, quit the application (this implies that the landing page window has been exited.
   */
  app.once('window-all-closed', () => {
    app.quit()
  })

  /**
   * once before-quit is fired, prevent the app from quitting and gracefully close the MapCacheWindowManager
   */
  app.on('before-quit', ((event) => {
    if (!readyToQuit) {
      event.preventDefault()
      MapCacheWindowManager.quit().then(() => {
        readyToQuit = true
        app.quit()
      })
    }
  }))

  /**
   * when activate is fired, if the app is not already running, start it.
   */
  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (!MapCacheWindowManager.isAppRunning()) {
      start()
    }
  })

  /**
   * once ready is fired, start the application, if not in production, install the vue dev tools
   */
  app.once('ready', async () => {
    if (!isProduction) {
      try {
        const { default: installExtension, VUEJS_DEVTOOLS } = require('electron-devtools-installer')
        await installExtension(VUEJS_DEVTOOLS)
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Vue Devtools failed to install')
      }
    }
    start()
  })
}
