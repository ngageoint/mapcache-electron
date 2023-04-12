import { app, protocol } from 'electron'
import path from 'path'
import MapCacheWindowManager from './lib/MapCacheWindowManager'
import { environment } from '../lib/env/env'
import setupProtocol from '../lib/protocol/protocol'
import { runMigration } from '../store/migration/migration'
import { setupInitialDirectories } from '../lib/util/file/FileUtilities'
import { default as install, VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import log from 'electron-log'

const gotTheLock = app.requestSingleInstanceLock()

// used to indicate the .gpkg file path that was used to launch MapCache
let gpkgFilePaths = []
let openFileTimeout = null

function processArguments (argv) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].endsWith('.gpkg')) {
      gpkgFilePaths.push(argv[i])
    }
  }
}

if (process.platform === 'win32') {
  processArguments(process.argv)
  app.setAppUserModelId('mil.nga.mapcache')
}

async function setupVueDevTools () {
  try {
    await install(VUEJS_DEVTOOLS)
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Vue Devtools failed to install')
  }
}

/**
 * Sets up the electron-log library. This will write logs to a file.
 */
function setupElectronLog () {
  log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs', 'mapcache.log')
  Object.assign(console, log.functions)
}

/**
 * Start the open-file timeout.
 */
function startOpenFileTimeout () {
  if (openFileTimeout != null) {
    clearTimeout(openFileTimeout)
  }
  openFileTimeout = setTimeout(() => {
    const handled = MapCacheWindowManager.processGeoPackageFiles(gpkgFilePaths.slice())
    if (handled) {
      gpkgFilePaths = []
      openFileTimeout = null
    } else {
      startOpenFileTimeout()
    }
  }, 250)
}

/**
 * Sets up handlers for various kill signals
 */
function setupEventHandlers () {
  process.on('unhandledRejection', (error) => {
    console.error(error)
  })

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
        (environment.geopackageLibrariesUrl != null && url.startsWith(environment.geopackageLibrariesUrl)) ||
        (environment.geopackageUrl != null && url.startsWith(environment.geopackageUrl)) ||
        (environment.mapcacheRepo != null && url.startsWith(environment.mapcacheRepo)) ||
        (environment.eventkitUrl != null && url.startsWith(environment.eventkitUrl))) {
        return { action: 'allow' }
      }
      return { action: 'deny' }
    })
  })
}

/**
 * Will run migration, setup directory structure, event handlers, electron log, create the app protocol and then launch the
 * landing page.
 */
async function start () {
  setupElectronLog()
  setupEventHandlers()
  setupWebContentHandling()

  if (!process.env.ELECTRON_RENDERER_URL) {
    setupProtocol(protocol, 'mapcache')
  }

  MapCacheWindowManager.launchLoaderWindow()

  // check if store is out of date, if so, delete content
  try {
    if (!await runMigration()) {
      // eslint-disable-next-line no-console
      console.error('Migration failed. Forcing reset.')
      if (!await runMigration(true)) {
        // eslint-disable-next-line no-console
        console.error('Reset failed. Contact administrator.')
        app.quit()
        return
      }
    }
  } catch (e) {
    app.quit()
  }

  setupInitialDirectories(app.getPath('userData'))

  await MapCacheWindowManager.start()
  startOpenFileTimeout()
}

if (!gotTheLock) {
  // eslint-disable-next-line no-console
  console.error('MapCache is already running.')
  app.quit()
} else {
  app.commandLine.appendSwitch('js-flags', '--expose_gc')

// Scheme must be registered before the app is ready
  protocol.registerSchemesAsPrivileged([
    { scheme: 'mapcache', privileges: { secure: true, standard: true, stream: true } }
  ])

  const isProduction = process.env.NODE_ENV === 'production'

  let readyToQuit = false

  /**
   * Handle open file requests (i.e. users click on files to open MapCache)
   */
  app.on('open-file', (event, path) => {
    gpkgFilePaths.push(path)
    startOpenFileTimeout()
    event.preventDefault()
  })

  /**
   * once window-all-closed is fired, quit the application (this implies that the landing page window has been exited).
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
      }).catch(() => {
        readyToQuit = true
        app.quit()
      })
    }
  }))


  /**
   * when activate is fired, if the app is not already running, start it.
   */
  app.on('activate', () => {
    // On macOS, it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (!MapCacheWindowManager.isAppRunning()) {
      start()
    }
  })

  app.on('second-instance', (event, argv) => {
    if (process.platform === 'win32') {
      processArguments(argv)
      startOpenFileTimeout()
    }
  })

  /**
   * once ready is fired, start the application, if not in production, install the vue dev tools
   */
  app.once('ready', () => {
    if (!isProduction) {
      setupVueDevTools().then(() => {
        start().catch(e => {
          console.error(e);
        })
      })
    } else {
      start().catch(e => {
        console.error(e);
      })
    }
  })
}
