import { app, BrowserWindow, Menu, shell, dialog, ipcMain, session, globalShortcut } from 'electron'
import path from 'path'
import isNil from 'lodash/isNil'
import MapcacheThreadHelper from '../threads/helpers/mapcacheThreadHelper'
import { getUserCertForUrl } from './auth/CertAuth'
import { getClientCredentials } from './auth/BasicAuth'

import {
  MAIN_CHANNELS,
  WORKER_CHANNELS,
  CANCEL_SERVICE_REQUEST,
  GET_APP_VERSION,
  GET_USER_DATA_DIRECTORY,
  GET_APP_DATA_DIRECTORY,
  OPEN_EXTERNAL,
  SHOW_SAVE_DIALOG,
  SHOW_SAVE_DIALOG_COMPLETED,
  SHOW_OPEN_DIALOG,
  SHOW_OPEN_DIALOG_COMPLETED,
  SHOW_PROJECT,
  CLOSE_PROJECT,
  CLOSING_PROJECT_WINDOW,
  BUILD_FEATURE_LAYER,
  CANCEL_BUILD_FEATURE_LAYER,
  BUILD_TILE_LAYER,
  CANCEL_BUILD_TILE_LAYER,
  QUICK_DOWNLOAD_GEOPACKAGE,
  WORKER_READY,
  PROCESS_SOURCE,
  PROCESS_SOURCE_COMPLETED,
  CANCEL_PROCESS_SOURCE,
  CANCEL_PROCESS_SOURCE_COMPLETED,
  ATTACH_MEDIA,
  ATTACH_MEDIA_COMPLETED,
  REQUEST_TILE,
  REQUEST_TILE_COMPLETED,
  CANCEL_TILE_REQUEST,
  GENERATE_GEOTIFF_RASTER_FILE,
  GENERATE_GEOTIFF_RASTER_FILE_COMPLETED,
  REQUEST_REPROJECT_TILE,
  REQUEST_REPROJECT_TILE_COMPLETED,
  CANCEL_REPROJECT_TILE_REQUEST,
  BUILD_TILE_LAYER_STATUS,
  BUILD_TILE_LAYER_COMPLETED,
  WORKER_BUILD_TILE_LAYER,
  WORKER_BUILD_TILE_LAYER_STATUS,
  WORKER_BUILD_TILE_LAYER_COMPLETED,
  CANCEL_BUILD_TILE_LAYER_COMPLETED,
  BUILD_FEATURE_LAYER_STATUS,
  BUILD_FEATURE_LAYER_COMPLETED,
  WORKER_BUILD_FEATURE_LAYER,
  WORKER_BUILD_FEATURE_LAYER_STATUS,
  WORKER_BUILD_FEATURE_LAYER_COMPLETED,
  CANCEL_BUILD_FEATURE_LAYER_COMPLETED,
  REQUEST_GEOPACKAGE_TABLE_RENAME,
  REQUEST_GEOPACKAGE_TABLE_RENAME_COMPLETED,
  REQUEST_GEOPACKAGE_TABLE_DELETE,
  REQUEST_GEOPACKAGE_TABLE_DELETE_COMPLETED,
  REQUEST_GEOPACKAGE_TABLE_COPY,
  REQUEST_GEOPACKAGE_TABLE_COPY_COMPLETED,
  SHOW_FEATURE_TABLE_WINDOW,
  HIDE_FEATURE_TABLE_WINDOW,
  FEATURE_TABLE_ACTION,
  FEATURE_TABLE_EVENT,
  LAUNCH_WITH_GEOPACKAGE_FILES,
  LOAD_OR_DISPLAY_GEOPACKAGES
} from './ipc/MapCacheIPC'

const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'
const isProduction = process.env.NODE_ENV === 'production'

/**
 * MapCacheWindowManager manages all interactions with browser windows
 */
class MapCacheWindowManager {
  mainWindow
  projectWindow
  loadingWindow
  workerWindow
  featureTableWindow
  isShuttingDown = false
  quitFromParent = false
  forceClose = false

  // request tracking
  requests = {}

  // userCredentialRequestInProgress
  userCredentialRequestInProgress = false

  setupGlobalShortcuts () {
    globalShortcut.register('CommandOrControl+Shift+S', () => {
      this.showAllDevTools()
    })

    globalShortcut.register('CommandOrControl+Shift+H', () => {
      this.hideAllDevTools()
    })

    if (!isProduction) {
      globalShortcut.register('CommandOrControl+Shift+C', () => {
        session.defaultSession.clearAuthCache()
      })
    }

    globalShortcut.register('CommandOrControl+Shift+L', () => {
      shell.showItemInFolder(path.join(app.getPath('userData'), 'logs', 'mapcache.log'))
    })
  }

  /**
   * Is the app running
   * @returns {boolean}
   */
  isAppRunning () {
    return !isNil(this.mainWindow) || !isNil(this.projectWindow) || !isNil(this.loadingWindow)
  }

  /**
   * Sets up authentication via a certificate
   */
  setupCertificateAuth () {
    app.removeAllListeners('select-client-certificate')
    app.on('select-client-certificate', (event, webContents, url, list, callback) => {
      const hostname = url.split(':')[0]
      const associatedRequest = Object.values(this.requests).find(request => {
        const hostnames = [new URL(request.url).hostname]
        if (!isNil(request.redirectURLs)) {
          request.redirectURLs.forEach(redirectURL => {
            hostnames.push(new URL(redirectURL).hostname)
          })
        }
        return hostnames.indexOf(hostname) !== -1
      })
      if (list && list.length > 0) {
        event.preventDefault()
        getUserCertForUrl(url, list, webContents).then((cert) => {
          callback(cert)
        }).catch(() => {
          // This intentionally doesn't call the callback, because Electron will remember the decision. If the app was
          // refreshed, we want Electron to try selecting a cert again when the app loads.
          if (!isNil(associatedRequest)) {
            webContents.send(CANCEL_SERVICE_REQUEST, associatedRequest.url)
          }
        })
      }
    })
    app.removeAllListeners('certificate-error')
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      event.preventDefault()
      callback(true)
    })
  }

  /**
   * Disables certificate authentication
   */
  static disableCertificateAuth () {
    app.removeAllListeners('select-client-certificate')
    app.removeAllListeners('certificate-error')
  }

  /**
   * Sets up the web request workflow.
   */
  setupWebRequestWorkflow () {
    // before sending headers, if it is marked with the auth enabled header, store the id of the request
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      if (!isNil(this.requests[details.id])) {
        this.requests[details.id].redirectURLs.push(details.url)
      } else {
        this.requests[details.id] = {
          url: details.url,
          redirectURLs: []
        }
      }
      const headers = details.requestHeaders

      callback({
        requestHeaders: headers
      })
    })

    // if auth was enabled, be sure to add response header allow for auth to occur
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      let headers = details.responseHeaders

      // protect against servers without required cors headers
      if (isNil(headers['Access-Control-Allow-Origin'])) {
        headers['Access-Control-Allow-Origin'] = headers['access-control-allow-origin']
      }
      if (isNil(headers['Access-Control-Allow-Origin']) || (Array.isArray(headers['Access-Control-Allow-Origin']) && headers['Access-Control-Allow-Origin'][0] === '*') || headers['Access-Control-Allow-Origin'] === '*') {
        headers['Access-Control-Allow-Origin'] = isProduction ? 'mapcache://.' : process.env.WEBPACK_DEV_SERVER_URL.substring(0, process.env.WEBPACK_DEV_SERVER_URL.length - 1)
      }
      delete headers['access-control-allow-origin']

      headers['Origin'] = headers['Access-Control-Allow-Origin']
      delete headers['origin']

      callback({
        responseHeaders: headers
      })
    })

    session.defaultSession.webRequest.onBeforeRedirect((details) => {
      if (!isNil(this.requests[details.id]) && !isNil(this.requests[details.id].redirectURLs)) {
        this.requests[details.id].redirectURLs.push(details.redirectURL)
      }
    })

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const url = webContents.getURL()
      // Verify URL is from localhost server or custom protocol
      if (!url.startsWith('http://localhost') && !url.startsWith('mapcache://')) {
        // Denies the permissions request
        return callback(false)
      } else {
        return callback(true)
      }
    })

    // once completed, we need to delete the map's id to prevent memory leak
    session.defaultSession.webRequest.onCompleted(details => {
      delete this.requests[details.id]
    })

    session.defaultSession.webRequest.onErrorOccurred(details => {
      delete this.requests[details.id]
    })
  }

  processGeoPackageFiles (filePaths) {
    if (filePaths.length > 0) {
      console.log(filePaths)
      if (this.mainWindow != null && this.mainWindow.isVisible()) {
        this.mainWindow.webContents.send(LAUNCH_WITH_GEOPACKAGE_FILES, filePaths)
      } else if (this.projectWindow != null && this.projectWindow.isVisible()) {
        this.projectWindow.webContents.send(LOAD_OR_DISPLAY_GEOPACKAGES, null, filePaths)
      } else {
        return false
      }
    }
    return true
  }

  /**
   * Starts the app and returns once the main window has loaded
   * @return {Promise<unknown>}
   */
  start () {
    return new Promise(resolve => {
      this.setupGlobalShortcuts()
      this.setupWebRequestWorkflow()
      this.registerEventHandlers()
      Promise.all([this.registerWorkerThreads(), this.launchMainWindow()]).then(() => {
        this.showMainWindow()
        resolve()
      })
    })
  }

  /**
   * Clear event listeners for worker threads
   */
  static clearWorkerThreadEventHandlers () {
    WORKER_CHANNELS.forEach(channel => {
      ipcMain.removeAllListeners(channel)
    })
  }

  /**
   * Registers the worker threads
   * @return {Promise<void>}
   */
  async registerWorkerThreads () {
    if (this.mapcacheThreadHelper == null) {
      MapCacheWindowManager.clearWorkerThreadEventHandlers()
      this.mapcacheThreadHelper = new MapcacheThreadHelper()
      await this.mapcacheThreadHelper.initialize()
      ipcMain.on(ATTACH_MEDIA, async (event, payload) => {
        const taskId = payload.id
        const success = await this.mapcacheThreadHelper.attachMedia(payload)
        event.sender.send(ATTACH_MEDIA_COMPLETED(taskId), success)
      })

      ipcMain.on(PROCESS_SOURCE, async (event, payload) => {
        const taskId = payload.source.id
        payload.id = taskId
        const result = await this.mapcacheThreadHelper.processDataSource(payload, event.sender)
        if (result && !result.cancelled) {
          event.sender.send(PROCESS_SOURCE_COMPLETED(taskId), result)
        }
      })

      ipcMain.on(CANCEL_PROCESS_SOURCE, (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.cancelTask(taskId).then(() => {
          event.sender.send(CANCEL_PROCESS_SOURCE_COMPLETED(taskId))
        })
      })

      ipcMain.on(CANCEL_TILE_REQUEST, async (event, payload) => {
        const taskId = payload.id
        event.sender.send(REQUEST_TILE_COMPLETED(taskId), {
          error: 'Cancelled by user.'
        })
      })

      ipcMain.on(REQUEST_TILE, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.renderTile(payload).then(response => {
          event.sender.send(REQUEST_TILE_COMPLETED(taskId), {
            base64Image: response
          })
        }).catch(e => {
          event.sender.send(REQUEST_TILE_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(GENERATE_GEOTIFF_RASTER_FILE, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.generateGeoTIFFRaster(payload).then((result) => {
          event.sender.send(GENERATE_GEOTIFF_RASTER_FILE_COMPLETED(taskId), result)
        }).catch(e => {
          event.sender.send(GENERATE_GEOTIFF_RASTER_FILE_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(REQUEST_REPROJECT_TILE, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.reprojectTile(payload).then(response => {
          event.sender.send(REQUEST_REPROJECT_TILE_COMPLETED(taskId), {
            base64Image: response
          })
        }).catch(e => {
          event.sender.send(REQUEST_REPROJECT_TILE_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(REQUEST_GEOPACKAGE_TABLE_RENAME, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.renameGeoPackageTable(payload).then(response => {
          event.sender.send(REQUEST_GEOPACKAGE_TABLE_RENAME_COMPLETED(taskId), {
            result: response
          })
        }).catch(e => {
          event.sender.send(REQUEST_GEOPACKAGE_TABLE_RENAME_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(REQUEST_GEOPACKAGE_TABLE_DELETE, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.deleteGeoPackageTable(payload).then(response => {
          event.sender.send(REQUEST_GEOPACKAGE_TABLE_DELETE_COMPLETED(taskId), {
            result: response
          })
        }).catch(e => {
          event.sender.send(REQUEST_GEOPACKAGE_TABLE_DELETE_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(REQUEST_GEOPACKAGE_TABLE_COPY, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.copyGeoPackageTable(payload).then(response => {
          event.sender.send(REQUEST_GEOPACKAGE_TABLE_COPY_COMPLETED(taskId), {
            result: response
          })
        }).catch(e => {
          event.sender.send(REQUEST_GEOPACKAGE_TABLE_COPY_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(CANCEL_REPROJECT_TILE_REQUEST, async (event, payload) => {
        const taskId = payload.id
        await this.mapcacheThreadHelper.cancelPendingTask(taskId)
      })
    }
  }

  /**
   * Clear event listeners
   */
  static clearEventHandlers () {
    MAIN_CHANNELS.forEach(channel => ipcMain.removeAllListeners(channel))
  }

  /**
   * Register Event Handlers
   */
  registerEventHandlers () {
    MapCacheWindowManager.clearEventHandlers()

    ipcMain.on(OPEN_EXTERNAL, (event, link) => {
      // this will only be received by the main page.
      // There is a filter in place in the preload script to ensure only the links presented on the landing page can be
      // passed through.
      shell.openExternal(link)
    })

    ipcMain.on(GET_APP_VERSION, (event) => {
      event.returnValue = app.getVersion()
    })

    ipcMain.on(GET_USER_DATA_DIRECTORY, (event) => {
      event.returnValue = app.getPath('userData')
    })

    ipcMain.on(GET_APP_DATA_DIRECTORY, (event) => {
      event.returnValue = app.getPath('appData')
    })

    ipcMain.on(SHOW_SAVE_DIALOG, (event, options) => {
      dialog.showSaveDialog(this.projectWindow, options).then(result => event.sender.send(SHOW_SAVE_DIALOG_COMPLETED, result))
    })

    ipcMain.on(SHOW_OPEN_DIALOG, (event, options) => {
      dialog.showOpenDialog(this.projectWindow, options).then(result => event.sender.send(SHOW_OPEN_DIALOG_COMPLETED, result))
    })

    ipcMain.on(SHOW_PROJECT, (event, projectId, geopackageIds, filePaths) => {
      this.showProject(projectId, geopackageIds, filePaths)
    })

    // setup feature table / map interaction
    ipcMain.on(SHOW_FEATURE_TABLE_WINDOW, (event, args) => {
      this.showHideFeatureTableWindow(true, args.force)
    })

    ipcMain.on(HIDE_FEATURE_TABLE_WINDOW, (event, args) => {
      this.showHideFeatureTableWindow(false)
      this.projectWindow.webContents.send(HIDE_FEATURE_TABLE_WINDOW, args)
    })

    ipcMain.on(FEATURE_TABLE_ACTION, (event, args) => {
      this.projectWindow.webContents.send(FEATURE_TABLE_ACTION, args)
    })

    ipcMain.on(FEATURE_TABLE_EVENT, (event, args) => {
      this.featureTableWindow.webContents.send(FEATURE_TABLE_EVENT, args)
    })

    ipcMain.on(CLOSE_PROJECT, () => {
      this.forceClose = true
      this.closeProject(true)
    })

    ipcMain.on(QUICK_DOWNLOAD_GEOPACKAGE, (event, payload) => {
      this.downloadURL(payload.url).then(() => {
      }).catch(() => {
        // eslint-disable-next-line no-console
        console.error('Failed to download GeoPackage.')
      })
    })
    ipcMain.on(BUILD_FEATURE_LAYER, (event, payload) => {
      const taskId = payload.configuration.id
      const statusCallback = (status) => {
        event.sender.send(BUILD_FEATURE_LAYER_STATUS(taskId), status)
      }
      const completedCallback = () => {
        event.sender.send(BUILD_FEATURE_LAYER_COMPLETED(taskId))
      }
      ipcMain.once(WORKER_BUILD_FEATURE_LAYER_COMPLETED(taskId), (event, result) => {
        ipcMain.removeAllListeners(WORKER_BUILD_FEATURE_LAYER_STATUS(taskId))
        if (!isNil(this.workerWindow)) {
          this.workerWindow.destroy()
          this.workerWindow = null
        }
        if (!isNil(result) && !isNil(result.error)) {
          result.message = 'Error'
          statusCallback(result)
        }
        completedCallback()
      })
      ipcMain.on(WORKER_BUILD_FEATURE_LAYER_STATUS(taskId), (event, status) => {
        statusCallback(status)
      })
      ipcMain.removeAllListeners(WORKER_READY)
      ipcMain.on(WORKER_READY, (event) => {
        event.sender.send(WORKER_BUILD_FEATURE_LAYER, {
          taskId: payload.configuration.id,
          configuration: payload.configuration
        })
      })
      this.launchWorkerAndExecuteConfiguration()
    })
    ipcMain.on(CANCEL_BUILD_FEATURE_LAYER, (event, payload) => {
      const taskId = payload.configuration.id
      ipcMain.removeAllListeners(WORKER_BUILD_FEATURE_LAYER_COMPLETED(taskId))
      ipcMain.removeAllListeners(WORKER_BUILD_FEATURE_LAYER_STATUS(taskId))
      if (!isNil(this.workerWindow)) {
        this.workerWindow.destroy()
        this.workerWindow = null
      }
      event.sender.send(CANCEL_BUILD_FEATURE_LAYER_COMPLETED(taskId))
    })
    ipcMain.on(BUILD_TILE_LAYER, (event, payload) => {
      const taskId = payload.configuration.id
      const statusCallback = (status) => {
        event.sender.send(BUILD_TILE_LAYER_STATUS(taskId), status)
      }
      const completedCallback = () => {
        event.sender.send(BUILD_TILE_LAYER_COMPLETED(taskId))
      }
      ipcMain.once(WORKER_BUILD_TILE_LAYER_COMPLETED(taskId), (event, result) => {
        ipcMain.removeAllListeners(WORKER_BUILD_TILE_LAYER_STATUS(taskId))
        if (!isNil(this.workerWindow)) {
          this.workerWindow.destroy()
          this.workerWindow = null
        }
        if (!isNil(result) && !isNil(result.error)) {
          result.message = 'Error'
          statusCallback(result)
        }
        completedCallback()
      })
      ipcMain.on(WORKER_BUILD_TILE_LAYER_STATUS(taskId), (event, status) => {
        statusCallback(status)
      })
      ipcMain.removeAllListeners(WORKER_READY)
      ipcMain.on(WORKER_READY, (event) => {
        event.sender.send(WORKER_BUILD_TILE_LAYER, {
          taskId: payload.configuration.id,
          configuration: payload.configuration
        })
      })
      this.launchWorkerAndExecuteConfiguration()
    })
    ipcMain.on(CANCEL_BUILD_TILE_LAYER, (event, payload) => {
      const taskId = payload.configuration.id
      ipcMain.removeAllListeners(WORKER_BUILD_TILE_LAYER_COMPLETED(taskId))
      ipcMain.removeAllListeners(WORKER_BUILD_TILE_LAYER_STATUS(taskId))
      if (!isNil(this.workerWindow)) {
        this.workerWindow.destroy()
        this.workerWindow = null
      }
      event.sender.send(CANCEL_BUILD_TILE_LAYER_COMPLETED(taskId))
    })
  }

  /**
   * Quits the app
   * @returns {Promise<void>}
   */
  async quit () {
    this.quitFromParent = true
    this.isShuttingDown = true
    MapCacheWindowManager.clearEventHandlers()
    MapCacheWindowManager.clearWorkerThreadEventHandlers()
    MapCacheWindowManager.disableCertificateAuth()
    try {
      if (!isNil(this.mapcacheThreadHelper)) {
        await this.mapcacheThreadHelper.terminate()
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
    try {
      if (!isNil(this.featureTableWindow)) {
        this.featureTableWindow.destroy()
        this.featureTableWindow = null
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
    try {
      if (!isNil(this.projectWindow)) {
        this.projectWindow.destroy()
        this.projectWindow = null
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
    try {
      if (!isNil(this.mainWindow)) {
        this.mainWindow.destroy()
        this.mainWindow = null
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
    try {
      if (!isNil(this.loadingWindow)) {
        this.loadingWindow.destroy()
        this.loadingWindow = null
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
    try {
      if (!isNil(this.workerWindow)) {
        this.workerWindow.destroy()
        this.workerWindow = null
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }

  /**
   * Loads content into a browser window
   * @param window
   * @param url
   * @param onFulfilled
   */
  loadContent (window, url, onFulfilled = () => {}) {
    window.loadURL(url).then(onFulfilled).catch(() => {
      // eslint-disable-next-line no-console
      console.error('Failed to load content.')
    })
  }

  /**
   * Launches worker process for building geopackage layers
   */
  launchWorkerAndExecuteConfiguration () {
    const workerURL = process.env.WEBPACK_DEV_SERVER_URL
      ? `${process.env.WEBPACK_DEV_SERVER_URL}#/worker`
      : 'mapcache://./index.html/#/worker'
    this.workerWindow = new BrowserWindow({
      webPreferences: {
        preload: path.join(__dirname, 'workerPreload.js')
      },
      show: false
    })
    this.loadContent(this.workerWindow, workerURL, () => {})
  }

  /**
   * Shows the landing page window
   */
  showMainWindow () {
    this.mainWindow.show()
    if (!isNil(this.loadingWindow)) {
      this.loadingWindow.destroy()
      this.loadingWindow = null
    }
    if (!isNil(this.projectWindow)) {
      this.projectWindow.destroy()
      this.projectWindow = null
    }
  }

  /**
   * Launches the main window (LandingPage)
   */
  launchMainWindow () {
    return new Promise((resolve => {
      const winURL = process.env.NODE_ENV === 'development'
        ? `${process.env.WEBPACK_DEV_SERVER_URL}`
        : `mapcache://./index.html`

      const menu = Menu.buildFromTemplate(this.getMenuTemplate())
      Menu.setApplicationMenu(menu)

      const windowHeight = 620 + (isWin ? 20 : 0)

      this.mainWindow = new BrowserWindow({
        title: 'MapCache',
        webPreferences: {
          preload: path.join(__dirname, 'mainPreload.js')
        },
        show: false,
        width: 790,
        height: windowHeight,
        minHeight: windowHeight,
        minWidth: 790,
        fullscreenable: false,
        resizable: false,
        maximizable: false
      })
      this.mainWindow.setMenu(menu)
      this.loadContent(this.mainWindow, winURL, () => {
        resolve()
      })
      this.mainWindow.on('close', () => {
        if (this.quitFromParent) {
          this.isShuttingDown = true
          if (!isNil(this.projectWindow)) {
            this.projectWindow.destroy()
          }
          this.mainWindow = null
        }
      })
    }))
  }

  /**
   * Launches the loader window
   */
  launchLoaderWindow () {
    const winURL = process.env.WEBPACK_DEV_SERVER_URL
      ? `${process.env.WEBPACK_DEV_SERVER_URL}/loader.html`
      : `mapcache://./loader.html`
    this.loadingWindow = new BrowserWindow({
      frame: false,
      show: false,
      width: 256,
      height: 256,
      transparent: true
    })
    setTimeout(() => {
      this.loadContent(this.loadingWindow, winURL, () => {
        this.loadingWindow.show()
      })
    }, 0)
  }

  /**
   * Launches the project window
   */
  launchProjectWindow () {
    const windowHeight = 700 + (isWin ? 20 : 0)

    this.projectWindow = new BrowserWindow({
      title: 'MapCache',
      webPreferences: {
        preload: path.join(__dirname, 'projectPreload.js')
      },
      show: false,
      width: 1200,
      height: windowHeight,
      minHeight: windowHeight,
      minWidth: 1000,
      useContentSize: true
    })
    this.projectWindow.on('close', (event) => {
      if (!this.isShuttingDown) {
        let leave = true
        let hasTasks = !isNil(this.workerWindow) || this.mapcacheThreadHelper.hasTasks()
        if (hasTasks && !this.forceClose) {
          const choice = dialog.showMessageBoxSync(this.projectWindow, {
            type: 'question',
            buttons: ['Close', 'Wait'],
            title: 'Close Project',
            message: 'There are one or more background tasks running. Are you sure you want to close the project?',
            defaultId: 0,
            cancelId: 1
          })
          leave = (choice === 0)
        }
        if (leave) {
          this.closeProject(false)
        }
        event.preventDefault()
      } else {
        this.projectWindow = null
      }
    })

    // login will only be done via the project window.
    this.projectWindow.webContents.on('login', (event, details, authInfo, callback) => {
      if (details.firstAuthAttempt) {
        event.preventDefault()
        getClientCredentials(details, authInfo, callback, this.projectWindow.webContents)
      }
    })
  }

  /**
   * shows or hides the feature table window
   * @param show
   * @param force
   */
  showHideFeatureTableWindow (show, force = false) {
    if (this.featureTableWindow) {
      if (show) {
        if (force || !this.featureTableWindow.isVisible()) {
          this.featureTableWindow.show()
        }
      } else {
        this.featureTableWindow.hide()
      }
    }
  }

  /**
   * Launches the feature table window
   * @param projectId
   */
  launchFeatureTableWindow (projectId) {
    const windowHeight = 385 + (isWin ? 20 : 0)
    this.featureTableWindow = new BrowserWindow({
      title: 'MapCache feature table',
      webPreferences: {
        preload: path.join(__dirname, 'featureTablePreload.js')
      },
      show: false,
      width: 650,
      height: windowHeight,
      minHeight: windowHeight,
      minWidth: 650,
      useContentSize: true
    })
    this.featureTableWindow.on('close', (event) => {
      if (this.closingProjectWindow) {
        this.closingProjectWindow = false
        this.featureTableWindow = null
      } else {
        this.showHideFeatureTableWindow(false)
        event.preventDefault()
      }
    })
    const winURL = process.env.WEBPACK_DEV_SERVER_URL
      ? `${process.env.WEBPACK_DEV_SERVER_URL}#/feature_table/${projectId}`
      : `mapcache://./index.html/#/feature_table/${projectId}`
    this.loadContent(this.featureTableWindow, winURL, () => {})
  }

  /**
   * Downloads a specified file
   * @param url
   * @returns {Promise<void>}
   */
  downloadURL = async (url) => {
    try {
      const download = require('electron-dl').download
      const fileUrl = require('file-url')
      await download(this.projectWindow, fileUrl(url))
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to download file.')
    }
  }

  /**
   * Closes the project window and launches the main window
   */
  closeProject (isDeleting = false) {
    MapCacheWindowManager.disableCertificateAuth()
    if (this.featureTableWindow) {
      this.closingProjectWindow = true
      this.featureTableWindow.hide()
      this.featureTableWindow.destroy()
      this.featureTableWindow = null
    }
    if (this.projectWindow) {
      this.projectWindow.webContents.send(CLOSING_PROJECT_WINDOW, {isDeleting})
      this.launchMainWindow().then(() => {
        this.showMainWindow()
      })
    }
  }

  /**
   * Launches the project window and displays a project
   * @param projectId - project id to show in the project window
   * @param geopackageIds - ids of geopackages to display
   * @param filePaths - filePaths of the geopackages to load and display
   */
  showProject (projectId, geopackageIds, filePaths) {
    try {
      this.launchProjectWindow()
      this.launchFeatureTableWindow(projectId)
      const winURL = process.env.WEBPACK_DEV_SERVER_URL
        ? `${process.env.WEBPACK_DEV_SERVER_URL}#/project/${projectId}`
        : `mapcache://./index.html/#/project/${projectId}`
      this.loadContent(this.projectWindow, winURL, () => {
        if (geopackageIds != null || filePaths != null) {
          this.projectWindow.webContents.send(LOAD_OR_DISPLAY_GEOPACKAGES, geopackageIds, filePaths)
        }
        this.projectWindow.show()
        this.setupCertificateAuth()
        setTimeout(() => {
          if (!isNil(this.mainWindow)) {
            this.mainWindow.hide()
            this.mainWindow.destroy()
            this.mainWindow = null
          }
        }, 250)
      })
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to show project')
    }
  }

  /**
   * Getst the menu template for a browser window
   * @returns {*[]}
   */
  getMenuTemplate () {
    const template = [
      {
        label: 'Edit',
        submenu: [
          {role: 'copy'},
          {role: 'paste'},
          {role: 'selectall'}
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forcereload' },
          { role: 'togglefullscreen' },
          { role: 'toggledevtools' }
        ]
      },
      {
        role: 'window',
        submenu: [
          {
            role: 'minimize'
          },
          {
            role: 'close'
          }
        ]
      },
      {
        role: 'help',
        submenu: [
          {
            label: 'Learn more',
            click () {
              shell.openExternal('https://github.com/ngageoint/mapcache-electron')
            }
          },
          {
            label: 'Documentation',
            click () {
              shell.openExternal(
                `https://github.com/ngageoint/mapcache-electron/blob/v1.1.1/README.md`
              )
            }
          },
          {
            label: 'What\'s New...',
            click () {
              shell.openExternal(
                `https://github.com/ngageoint/mapcache-electron/blob/v1.1.1/changelog/v1.1.1.md`
              )
            }
          }
        ]
      }
    ]

    if (isMac) {
      template.unshift({
        label: 'MapCache',
        submenu: [
          {
            role: 'about'
          },
          {
            type: 'separator'
          },
          {
            role: 'services',
            submenu: []
          },
          {
            type: 'separator'
          },
          {
            role: 'hide'
          },
          {
            role: 'hideothers'
          },
          {
            role: 'unhide'
          },
          {
            type: 'separator'
          },
          {
            role: 'quit'
          }
        ]
      })
      template[3].submenu = [
        {
          role: 'close'
        },
        {
          role: 'minimize'
        },
        {
          role: 'zoom'
        },
        {
          type: 'separator'
        },
        {
          role: 'front'
        }
      ]
    } else {
      template.unshift({
        label: 'File',
        submenu: [{
          role: 'quit'
        }]
      })
    }

    return template
  }

  /**
   * Shows devtools for all visible windows
   */
  showAllDevTools() {
    if (this.projectWindow) {
      this.projectWindow.webContents.openDevTools()
    }
    if (this.mainWindow) {
      this.mainWindow.webContents.openDevTools()
    }
    if (this.workerWindow) {
      this.workerWindow.webContents.openDevTools()
    }
    if (this.featureTableWindow) {
      this.featureTableWindow.webContents.openDevTools()
    }
  }

  /**
   * Hides all devtools for visible windows
   */
  hideAllDevTools() {
    if (this.projectWindow) {
      this.projectWindow.webContents.closeDevTools()
    }
    if (this.mainWindow) {
      this.mainWindow.webContents.closeDevTools()
    }
    if (this.workerWindow) {
      this.workerWindow.webContents.closeDevTools()
    }
    if (this.featureTableWindow) {
      this.featureTableWindow.webContents.closeDevTools()
    }
  }
}

export default new MapCacheWindowManager()
