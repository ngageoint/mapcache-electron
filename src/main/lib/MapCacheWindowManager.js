import { app, BrowserWindow, Menu, shell, dialog, ipcMain, session, globalShortcut, protocol } from 'electron'
import path from 'path'
import isNil from 'lodash/isNil'
import setupProtocol from '../../lib/protocol/protocol'
import MapCacheThreadHelper from '../../lib/threads/helpers/mapcacheThreadHelper'
import { getUserCertForUrl } from './auth/CertAuth'
import { getClientCredentials } from './auth/BasicAuth'
import store from '../../renderer/src/store/main'
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
  REQUEST_GEOPACKAGE_TABLE_COUNT,
  REQUEST_GEOPACKAGE_TABLE_COUNT_COMPLETED,
  REQUEST_GEOPACKAGE_TABLE_SEARCH,
  REQUEST_GEOPACKAGE_TABLE_SEARCH_COMPLETED,
  SHOW_FEATURE_TABLE_WINDOW,
  HIDE_FEATURE_TABLE_WINDOW,
  FEATURE_TABLE_ACTION,
  FEATURE_TABLE_EVENT,
  LAUNCH_WITH_GEOPACKAGE_FILES,
  LOAD_OR_DISPLAY_GEOPACKAGES,
  LAUNCH_USER_GUIDE,
  SEND_WINDOW_TO_FRONT,
  REDO,
  UNDO,
  REQUEST_TILE_COMPILATION,
  REQUEST_TILE_COMPILATION_COMPLETED,
  CANCEL_TILE_COMPILATION_REQUEST, WEB_VIEW_AUTH_REQUEST, WEB_VIEW_AUTH_CANCEL,
  CLOSE_APP
} from './ipc/MapCacheIPC'
import windowStateKeeper from 'electron-window-state'
import WebViewAuth from './auth/WebViewAuth'
import { download } from 'electron-dl'

const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'
const isProduction = app.isPackaged

/**
 * MapCacheWindowManager manages all interactions with browser windows
 */
class MapCacheWindowManager {
  static MAPCACHE_SESSION_PARTITION = 'persist:mapcache'

  mainWindow
  projectWindow
  loadingWindow
  workerWindow
  releaseNotesWindow
  userGuideWindow
  featureTableWindow
  mainWindowState
  projectWindowState
  featureTableWindowState
  closingProjectWindow = false
  isShuttingDown = false
  quitFromParent = false
  forceClose = false
  store
  webViewAuth

  // request tracking
  requests = {}

  // track web view url requests
  webViewURLs = {}

  mapCachePartitionedSession = null

  setupGlobalShortcuts () {
    globalShortcut.register('CommandOrControl+Shift+S', () => {
      this.showAllDevTools()
    })

    globalShortcut.register('CommandOrControl+Shift+H', () => {
      this.hideAllDevTools()
    })

    if (!isProduction) {
      globalShortcut.register('CommandOrControl+Shift+C', async () => {
        await this.clearSessionCache()
      })
    }

    globalShortcut.register('CommandOrControl+Shift+L', () => {
      shell.showItemInFolder(path.join(app.getPath('userData'), 'logs', 'mapcache.log'))
    })
  }

  async clearSessionCache () {
    const session = this.getMapCacheSession()
    await session.clearCache()
    await session.clearAuthCache()
    await session.clearStorageData()
  }

  /**
   * Returns the Session used by MapCache
   * @returns {Electron.Session}
   */
  getMapCacheSession () {
    if (this.mapCachePartitionedSession == null) {
      this.mapCachePartitionedSession = session.fromPartition(MapCacheWindowManager.MAPCACHE_SESSION_PARTITION)
      setupProtocol(this.mapCachePartitionedSession.protocol, 'mapcache')
    }
    return this.mapCachePartitionedSession
  }

  /**
   * Gets the MapCache session name
   * @returns {string}
   */
  getMapCacheSessionName () {
    return MapCacheWindowManager.MAPCACHE_SESSION_PARTITION
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
            if (!webContents.isCrashed()) {
              webContents.send(CANCEL_SERVICE_REQUEST, associatedRequest.url)
            }
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
   * Gets the origin for a url
   * @param url
   * @returns {string}
   */
  getOrigin (url) {
    const pathArray = url.split( '/' )
    const protocol = pathArray[0]
    const host = pathArray[2]
    return protocol + '//' + host
  }

  /**
   * Sets up the web request workflow.
   */
  setupWebRequestWorkflow () {
    // before sending headers, if it is marked with the auth enabled header, store the id of the request
    this.getMapCacheSession().webRequest.onBeforeSendHeaders((details, callback) => {
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

    const origin = isProduction ? 'mapcache://.' : process.env.ELECTRON_RENDERER_URL

    const fixHeaders = (headers) => {
      // protect against servers without required cors headers
      if (isNil(headers['Access-Control-Allow-Origin'])) {
        headers['Access-Control-Allow-Origin'] = headers['access-control-allow-origin']
      }
      if (isNil(headers['Access-Control-Allow-Origin']) || (Array.isArray(headers['Access-Control-Allow-Origin']) && headers['Access-Control-Allow-Origin'][0] === '*') || headers['Access-Control-Allow-Origin'] === '*') {
        headers['Access-Control-Allow-Origin'] = origin
      }
      if (Array.isArray(headers['Access-Control-Allow-Origin']) && headers['Access-Control-Allow-Origin'].length === 1) {
        headers['Access-Control-Allow-Origin'] = headers['Access-Control-Allow-Origin'][0]
      }
      delete headers['access-control-allow-origin']

      headers['Origin'] = headers['Access-Control-Allow-Origin']
      delete headers['origin']

      headers['Access-Control-Allow-Credentials'] = 'true'
      delete headers['access-control-allow-credentials']
    }

    // if auth was enabled, be sure to add response header allow for auth to occur
    this.getMapCacheSession().webRequest.onHeadersReceived((details, callback) => {
      let headers = details.responseHeaders

      fixHeaders(headers)

      callback({
        responseHeaders: headers
      })
    })

    this.getMapCacheSession().webRequest.onBeforeRedirect((details) => {
      if (!isNil(this.requests[details.id]) && !isNil(this.requests[details.id].redirectURLs)) {
        this.requests[details.id].redirectURLs.push(details.redirectURL)
      }
    })

    this.getMapCacheSession().setPermissionRequestHandler((webContents, permission, callback) => {
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
    this.getMapCacheSession().webRequest.onCompleted(details => {
      if (this.webViewAuth != null) {
        this.webViewAuth.onWebRequestCompleted(details, async () => {
          this.getMapCacheSession().clearAuthCache()
        })
      }
      delete this.requests[details.id]
    })

    this.getMapCacheSession().webRequest.onErrorOccurred(details => {
      if (this.webViewAuth != null) {
        this.webViewAuth.onWebRequestErrored(details)
      }
      delete this.requests[details.id]
    })
  }

  processGeoPackageFiles (filePaths) {
    if (filePaths.length > 0) {
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
   * Sets up the vuex store, which will listen for state changes from the browser processes
   */
  setupVuexStore () {
    this.store = store
  }

  setupAuthWebViewHandler () {
    // track a webview was created, this is typically due to an auth page that needs to be displayed
    let src = null;
    app.on('web-contents-created', (event, contents) => {
      // do not allow web views to be attached, mapcache should not request any web views
      contents.on('will-attach-webview', (webViewEvent, webPreferences, params) => {
        // Strip away preload scripts if unused or verify their location is legitimate
        delete webPreferences.preload
        // Disable Node.js integration
        webPreferences.nodeIntegration = false
        src = params.src
        // verify
        if (this.webViewURLs[src] == null) {
          event.preventDefault();
        } else {
          delete this.webViewURLs[src]
        }
      })

      contents.on('did-attach-webview', (event, webContents) => {
        this.webViewAuth = new WebViewAuth(webContents, this.projectWindow, src)
      })
    })
  }

  /**
   * Starts the app and returns once the main window has loaded
   * @return {Promise<unknown>}
   */
  start () {
    return new Promise(resolve => {
      this.setupVuexStore()
      this.setupGlobalShortcuts()
      this.setupWebRequestWorkflow()
      this.registerEventHandlers()
      this.setupAuthWebViewHandler()
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

  sendResponse (event, channel, args) {
    if (!event.sender.isDestroyed() && !event.sender.isCrashed()) {
      try {
        event.sender.send(channel, args)
      } catch (e) {
        console.error(e)
      }
    }
  }

  /**
   * Registers the worker threads
   * @return {Promise<void>}
   */
  async registerWorkerThreads () {
    if (this.mapcacheThreadHelper == null) {
      MapCacheWindowManager.clearWorkerThreadEventHandlers()
      this.mapcacheThreadHelper = new MapCacheThreadHelper()
      await this.mapcacheThreadHelper.initialize()
      ipcMain.on(ATTACH_MEDIA, async (event, payload) => {
        const taskId = payload.id
        const success = await this.mapcacheThreadHelper.attachMedia(payload)
        this.sendResponse(event, ATTACH_MEDIA_COMPLETED(taskId), success)
      })

      ipcMain.on(PROCESS_SOURCE, async (event, payload) => {
        const taskId = payload.source.id
        payload.id = taskId
        const result = await this.mapcacheThreadHelper.processDataSource(payload, event.sender)
        if (result && !result.cancelled) {
          this.sendResponse(event, PROCESS_SOURCE_COMPLETED(taskId), result)
        }
      })

      ipcMain.on(CANCEL_PROCESS_SOURCE, (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.cancelTask(taskId, true).then(() => {
          this.sendResponse(event, CANCEL_PROCESS_SOURCE_COMPLETED(taskId))
        })
      })

      ipcMain.on(CANCEL_TILE_REQUEST, async (event, payload) => {
        const taskId = payload.id
        await this.mapcacheThreadHelper.cancelTask(taskId, false).then(() => {
          this.sendResponse(event, REQUEST_TILE_COMPLETED(taskId), {
            error: 'Cancelled by user.'
          })
        })
      })

      ipcMain.on(REQUEST_TILE, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.renderTile(payload).then(response => {
          this.sendResponse(event, REQUEST_TILE_COMPLETED(taskId), {
            base64Image: response
          })
        }).catch(e => {
          this.sendResponse(event, REQUEST_TILE_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(GENERATE_GEOTIFF_RASTER_FILE, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.generateGeoTIFFRaster(payload).then((result) => {
          this.sendResponse(event, GENERATE_GEOTIFF_RASTER_FILE_COMPLETED(taskId), result)
        }).catch(e => {
          this.sendResponse(event, GENERATE_GEOTIFF_RASTER_FILE_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(REQUEST_TILE_COMPILATION, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.compileTiles(payload, event.sender).then(response => {
          this.sendResponse(event, REQUEST_TILE_COMPILATION_COMPLETED(taskId), {
            base64Image: response
          })
        }).catch(e => {
          this.sendResponse(event, REQUEST_TILE_COMPILATION_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(REQUEST_GEOPACKAGE_TABLE_RENAME, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.renameGeoPackageTable(payload).then(response => {
          this.sendResponse(event, REQUEST_GEOPACKAGE_TABLE_RENAME_COMPLETED(taskId), {
            result: response
          })
        }).catch(e => {
          this.sendResponse(event, REQUEST_GEOPACKAGE_TABLE_RENAME_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(REQUEST_GEOPACKAGE_TABLE_DELETE, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.deleteGeoPackageTable(payload).then(response => {
          this.sendResponse(event, REQUEST_GEOPACKAGE_TABLE_DELETE_COMPLETED(taskId), {
            result: response
          })
        }).catch(e => {
          this.sendResponse(event, REQUEST_GEOPACKAGE_TABLE_DELETE_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(REQUEST_GEOPACKAGE_TABLE_COPY, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.copyGeoPackageTable(payload).then(response => {
          this.sendResponse(event, REQUEST_GEOPACKAGE_TABLE_COPY_COMPLETED(taskId), {
            result: response
          })
        }).catch(e => {
          this.sendResponse(event, REQUEST_GEOPACKAGE_TABLE_COPY_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(REQUEST_GEOPACKAGE_TABLE_COUNT, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.countGeoPackageTable(payload).then(response => {
          this.sendResponse(event, REQUEST_GEOPACKAGE_TABLE_COUNT_COMPLETED(taskId), {
            result: response
          })
        }).catch(e => {
          this.sendResponse(event, REQUEST_GEOPACKAGE_TABLE_COUNT_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(REQUEST_GEOPACKAGE_TABLE_SEARCH, async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.searchGeoPackageTable(payload).then(response => {
          this.sendResponse(event, REQUEST_GEOPACKAGE_TABLE_SEARCH_COMPLETED(taskId), {
            result: response
          })
        }).catch(e => {
          this.sendResponse(event, REQUEST_GEOPACKAGE_TABLE_SEARCH_COMPLETED(taskId), {
            error: e
          })
        })
      })

      ipcMain.on(CANCEL_TILE_COMPILATION_REQUEST, async (event, payload) => {
        const taskId = payload.id
        await this.mapcacheThreadHelper.cancelTask(taskId, false)
      })

      ipcMain.on(CLOSE_APP, () => {
        app.quit()
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
      // There is a filter in place in the preload script to ensure only the links presented on the landing page can be passed through.
      shell.openExternal(link)
    })

    ipcMain.on(SEND_WINDOW_TO_FRONT, (event) => {
      BrowserWindow.fromWebContents(event.sender).show()
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
      dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), options).then(result => this.sendResponse(event, SHOW_SAVE_DIALOG_COMPLETED, result))
    })

    ipcMain.on(SHOW_OPEN_DIALOG, (event, options) => {
      dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), options).then(result => this.sendResponse(event, SHOW_OPEN_DIALOG_COMPLETED, result))
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
      if (!this.projectWindow.webContents.isCrashed()) {
        this.projectWindow.webContents.send(HIDE_FEATURE_TABLE_WINDOW, args)
      }
    })

    ipcMain.on(FEATURE_TABLE_ACTION, (event, args) => {
      if (!this.projectWindow.webContents.isCrashed()) {
        this.projectWindow.webContents.send(FEATURE_TABLE_ACTION, args)
      }
    })

    ipcMain.on(FEATURE_TABLE_EVENT, (event, args) => {
      if (!this.featureTableWindow.webContents.isCrashed()) {
        this.featureTableWindow.webContents.send(FEATURE_TABLE_EVENT, args)
      }
    })

    ipcMain.on(CLOSE_PROJECT, () => {
      this.forceClose = true
      this.closeProject(true)
    })

    ipcMain.on(BUILD_FEATURE_LAYER, (event, payload) => {
      const taskId = payload.configuration.id
      const statusCallback = (status) => {
        this.sendResponse(event, BUILD_FEATURE_LAYER_STATUS(taskId), status)
      }
      const completedCallback = () => {
        this.sendResponse(event, BUILD_FEATURE_LAYER_COMPLETED(taskId))
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
        this.sendResponse(event, WORKER_BUILD_FEATURE_LAYER, {
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
      this.sendResponse(event, CANCEL_BUILD_FEATURE_LAYER_COMPLETED(taskId))
    })
    ipcMain.on(BUILD_TILE_LAYER, (event, payload) => {
      const taskId = payload.configuration.id
      const statusCallback = (status) => {
        this.sendResponse(event, BUILD_TILE_LAYER_STATUS(taskId), status)
      }
      const completedCallback = () => {
        this.sendResponse(event, BUILD_TILE_LAYER_COMPLETED(taskId))
      }
      ipcMain.once(WORKER_BUILD_TILE_LAYER_COMPLETED(taskId), (event, result) => {
        ipcMain.removeAllListeners(WORKER_BUILD_TILE_LAYER_STATUS(taskId))
        if (!isNil(this.workerWindow)) {
          //this.workerWindow.destroy()
          //this.workerWindow = null
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
        this.sendResponse(event, WORKER_BUILD_TILE_LAYER, {
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
      this.sendResponse(event, CANCEL_BUILD_TILE_LAYER_COMPLETED(taskId))
    })

    ipcMain.on(LAUNCH_USER_GUIDE, () => {
      this.launchUserGuideWindow()
    })

    ipcMain.on(WEB_VIEW_AUTH_REQUEST, (event, url) => {
      this.webViewURLs[url] = url
    })
    ipcMain.on(WEB_VIEW_AUTH_CANCEL, () => {
      if (this.webViewAuth != null) {
        this.webViewAuth.userCancel()
        this.webViewAuth = null
      }
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
    } catch (e) {
    }
    try {
      if (!isNil(this.featureTableWindow)) {
        this.featureTableWindow.destroy()
        this.featureTableWindow = null
      }
      // eslint-disable-next-line no-empty
    } catch (e) {
    }
    try {
      if (!isNil(this.projectWindow)) {
        this.projectWindow.destroy()
        this.projectWindow = null
      }
      // eslint-disable-next-line no-empty
    } catch (e) {
    }
    try {
      if (!isNil(this.releaseNotesWindow)) {
        this.releaseNotesWindow.destroy()
        this.releaseNotesWindow = null
      }
      // eslint-disable-next-line no-empty
    } catch (e) {
    }
    try {
      if (!isNil(this.userGuideWindow)) {
        this.userGuideWindow.destroy()
        this.userGuideWindow = null
      }
      // eslint-disable-next-line no-empty
    } catch (e) {
    }
    try {
      if (!isNil(this.mainWindow)) {
        this.mainWindow.destroy()
        this.mainWindow = null
      }
      // eslint-disable-next-line no-empty
    } catch (e) {
    }
    try {
      if (!isNil(this.loadingWindow)) {
        this.loadingWindow.destroy()
        this.loadingWindow = null
      }
      // eslint-disable-next-line no-empty
    } catch (e) {
    }
    try {
      if (!isNil(this.workerWindow)) {
        this.workerWindow.destroy()
        this.workerWindow = null
      }
      // eslint-disable-next-line no-empty
    } catch (e) {
    }
  }

  /**
   * Loads content into a browser window
   * @param window
   * @param url
   * @param onFulfilled
   */
  loadContent (window, url, onFulfilled = () => {}) {
    if (window != null) {
      window.loadURL(url).then(onFulfilled).catch((e) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load content.')
      })
    }
  }

  /**
   * Launches worker process for building geopackage layers
   */
  launchWorkerAndExecuteConfiguration () {
    const workerURL = process.env.ELECTRON_RENDERER_URL
      ? `${process.env.ELECTRON_RENDERER_URL}/#/worker`
      : 'mapcache://./renderer/index.html/#/worker'
    this.workerWindow = new BrowserWindow({
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'workerPreload.js'),
        partition: MapCacheWindowManager.MAPCACHE_SESSION_PARTITION,
        sandbox: false
      },
      show: false
    })
    this.loadContent(this.workerWindow, workerURL, () => {
    })
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
        ? `${process.env.ELECTRON_RENDERER_URL}/index.html`
        : `mapcache://./renderer/index.html`

      const menu = Menu.buildFromTemplate(this.getMenuTemplate())
      Menu.setApplicationMenu(menu)

      const windowHeight = 700 + (isWin ? 64 : 0)
      const windowWidth = 790

      this.mainWindowState = windowStateKeeper({
        defaultWidth: windowWidth,
        defaultHeight: windowHeight,
        file: 'landing-page.json',
        path: path.join(app.getPath('userData'), 'window_state')
      })

      this.mainWindow = new BrowserWindow({
        title: 'MapCache',
        webPreferences: {
          preload: path.join(__dirname, '..', 'preload', 'mainPreload.js'),
          partition: MapCacheWindowManager.MAPCACHE_SESSION_PARTITION,
          sandbox: false
        },
        show: false,
        x: this.mainWindowState.x,
        y: this.mainWindowState.y,
        width: windowWidth,
        minWidth: windowWidth,
        maxWidth: windowWidth,
        height: windowHeight,
        minHeight: windowHeight,
        maxHeight: windowHeight,
        fullscreenable: false,
        resizable: false,
        maximizable: false
      })

      this.mainWindowState.manage(this.mainWindow)

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
        if (isNil(this.projectWindow) || !this.projectWindow.isVisible()) {
          if (!isNil(this.releaseNotesWindow)) {
            this.releaseNotesWindow.destroy()
            this.releaseNotesWindow = null
          }
          if (!isNil(this.userGuideWindow)) {
            this.userGuideWindow.destroy()
            this.userGuideWindow = null
          }
        }
      })
    }))
  }

  /**
   * Launches the loader window
   */
  launchLoaderWindow () {
    const winURL = process.env.ELECTRON_RENDERER_URL
      ? `${process.env.ELECTRON_RENDERER_URL}/loader.html`
      : `mapcache://./renderer/loader.html`

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

  launchReleaseNotesWindow () {
    if (this.releaseNotesWindow == null) {
      const windowHeight = 700 + (isWin ? 20 : 0)
      const winURL = process.env.ELECTRON_RENDERER_URL
        ? `${process.env.ELECTRON_RENDERER_URL}/index.html/#/release_notes`
        : `mapcache://./renderer/index.html/#/release_notes`
      this.releaseNotesWindowState = windowStateKeeper({
        defaultWidth: 800,
        defaultHeight: windowHeight,
        file: 'release-notes-page.json',
        path: path.join(app.getPath('userData'), 'window_state')
      })
      this.releaseNotesWindow = new BrowserWindow({
        title: 'MapCache Release Notes',
        show: false,
        x: this.releaseNotesWindowState.x,
        y: this.releaseNotesWindowState.y,
        width: this.releaseNotesWindowState.width,
        height: this.releaseNotesWindowState.height,
        minHeight: 600,
        minWidth: 600
      })
      this.releaseNotesWindow.on('close', () => {
        this.releaseNotesWindow = null
      })
      this.loadContent(this.releaseNotesWindow, winURL, () => {
        this.releaseNotesWindow.show()
      })
    } else {
      this.releaseNotesWindow.show()
    }
  }

  launchUserGuideWindow () {
    if (this.userGuideWindow == null) {
      const windowHeight = 1000 + (isWin ? 20 : 0)
      const winURL = process.env.ELECTRON_RENDERER_URL
        ? `${process.env.ELECTRON_RENDERER_URL}/index.html/#/user_guide`
        : `mapcache://./renderer/index.html/#/user_guide`
      this.userGuideWindowState = windowStateKeeper({
        defaultWidth: 900,
        defaultHeight: windowHeight,
        file: 'user-guide-page.json',
        path: path.join(app.getPath('userData'), 'window_state')
      })
      this.userGuideWindow = new BrowserWindow({
        title: 'MapCache User Guide',
        webPreferences: {
          preload: path.join(__dirname, '..', 'preload', 'userGuidePreload.js'),
          sandbox: false
        },
        show: false,
        x: this.userGuideWindowState.x,
        y: this.userGuideWindowState.y,
        width: this.userGuideWindowState.width,
        height: this.userGuideWindowState.height,
        minWidth: 800,
        minHeight: 800,
      })
      this.userGuideWindow.on('close', () => {
        this.userGuideWindow = null
      })
      this.loadContent(this.userGuideWindow, winURL, () => {
        this.userGuideWindow.show()
      })
    } else {
      this.userGuideWindow.show()
    }
  }

  /**
   * Launches the project window
   */
  launchProjectWindow () {
    const windowHeight = 828 + (isWin ? 20 : 0)
    const minWidth = 1200

    this.projectWindowState = windowStateKeeper({
      defaultWidth: 1200,
      minWidth: minWidth,
      defaultHeight: windowHeight,
      file: 'project-page.json',
      path: path.join(app.getPath('userData'), 'window_state'),
      fullScreen: false,
      maximize: false
    })

    // track state, this will determine how we show
    this.projectWindowMaximized = this.projectWindowState.isMaximized
    this.projectWindowFullScreen = this.projectWindowState.isFullScreen

    this.projectWindow = new BrowserWindow({
      title: 'MapCache',
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'projectPreload.js'),
        webviewTag: true,
        partition: MapCacheWindowManager.MAPCACHE_SESSION_PARTITION,
        sandbox: false
      },
      show: false,
      x: this.projectWindowState.x,
      y: this.projectWindowState.y,
      width: this.projectWindowState.width,
      height: this.projectWindowState.height,
      minHeight: windowHeight,
      minWidth: minWidth
    })

    this.projectWindowState.manage(this.projectWindow)

    this.closingProjectWindow = false

    this.projectWindow.on('focus', () => {
      globalShortcut.register('CommandOrControl+Shift+Z', () => {
        if (this.projectWindow != null) {
          this.projectWindow.send(REDO)
        }
      })
      globalShortcut.register('CommandOrControl+Z', () => {
        if (this.projectWindow != null) {
          this.projectWindow.send(UNDO)
        }
      })
    })

    this.projectWindow.on('blur', () => {
      globalShortcut.unregister('CommandOrControl+Shift+Z')
      globalShortcut.unregister('CommandOrControl+Z')
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
      event.preventDefault()
      getClientCredentials(details, authInfo, callback, this.projectWindow.webContents)
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
          this.featureTableWindowState.manage(this.featureTableWindow)
          if (this.isFeatureTableWindowFullScreen) {
            this.featureTableWindow.setFullScreen(true)
          } else if (this.isFeatureTableWindowMaximized) {
            this.featureTableWindow.maximize()
          }
          this.featureTableWindow.show()
        }
      } else {
        this.featureTableWindowState.unmanage(this.featureTableWindow)
        this.isFeatureTableWindowFullScreen = this.featureTableWindowState.isFullScreen
        this.isFeatureTableWindowMaximized = this.featureTableWindowState.isMaximized
        if (this.isFeatureTableWindowFullScreen) {
          this.featureTableWindow.once('leave-full-screen', () => {
            this.featureTableWindow.hide()
          })
          this.featureTableWindow.setFullScreen(false)
        } else {
          this.featureTableWindow.hide()
        }
      }
    }
  }

  /**
   * Launches the feature table window
   * @param projectId
   */
  launchFeatureTableWindow (projectId) {
    const windowHeight = 385 + (isWin ? 20 : 0)
    this.featureTableWindowState = windowStateKeeper({
      defaultWidth: 650,
      defaultHeight: windowHeight,
      file: 'feature-table-page.json',
      path: path.join(app.getPath('userData'), 'window_state'),
      fullScreen: false,
      maximize: false
    })

    this.featureTableWindow = new BrowserWindow({
      title: 'MapCache feature table',
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'featureTablePreload.js'),
        partition: MapCacheWindowManager.MAPCACHE_SESSION_PARTITION,
        sandbox: false
      },
      show: false,
      x: this.featureTableWindowState.x,
      y: this.featureTableWindowState.y,
      width: this.featureTableWindowState.width,
      height: this.featureTableWindowState.height,
      minHeight: windowHeight,
      minWidth: 650
    })
    this.isFeatureTableWindowFullScreen = this.featureTableWindowState.isFullScreen
    this.isFeatureTableWindowMaximized = this.featureTableWindowState.isMaximized

    this.featureTableWindow.on('close', (event) => {
      if (this.closingProjectWindow) {
        this.featureTableWindow = null
      } else {
        this.showHideFeatureTableWindow(false)
        event.preventDefault()
      }
    })
    this.featureTableWindow.on('hide', () => {
      if (this.projectWindow != null && !this.projectWindow.webContents.isCrashed()) {
        this.projectWindow.webContents.send(HIDE_FEATURE_TABLE_WINDOW)
      }
    })
    const winURL = process.env.ELECTRON_RENDERER_URL
      ? `${process.env.ELECTRON_RENDERER_URL}/index.html/#/feature_table/${projectId}`
      : `mapcache://./renderer/index.html/#/feature_table/${projectId}`
    this.loadContent(this.featureTableWindow, winURL, () => {
    })
  }

  /**
   * Downloads a specified file
   * @param url
   * @returns {Promise<void>}
   */
  downloadURL = async (url) => {
    try {
      const { fileUrl } = await import('file-url');
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
    if (this.webViewAuth != null) {
      this.webViewAuth.finish()
      this.webViewAuth = null
      this.webViewURLs = {}
    }
    if (this.featureTableWindow) {
      this.closingProjectWindow = true
      this.featureTableWindow.hide()
      this.featureTableWindow.destroy()
      this.featureTableWindow = null
    }
    if (this.projectWindow != null && !this.projectWindow.webContents.isCrashed()) {
      this.projectWindow.webContents.send(CLOSING_PROJECT_WINDOW, { isDeleting })
    }
    this.launchMainWindow().then(() => {
      this.showMainWindow()
    })
  }

  /**
   * Launches the project window and displays a project
   * @param projectId - project id to show in the project window
   * @param geopackageIds - ids of geopackages to display
   * @param filePaths - filePaths of the geopackages to load and display
   */
  showProject (projectId, geopackageIds, filePaths) {
    try {
      const winURL = process.env.ELECTRON_RENDERER_URL
        ? `${process.env.ELECTRON_RENDERER_URL}/index.html/#/project/${projectId}`
        : `mapcache://./renderer/index.html/#/project/${projectId}`
      this.launchProjectWindow()
      this.launchFeatureTableWindow(projectId)
      this.loadContent(this.projectWindow, winURL, () => {
        if (geopackageIds != null || filePaths != null && (this.projectWindow != null && !this.projectWindow.webContents.isCrashed())) {
          this.projectWindow.webContents.send(LOAD_OR_DISPLAY_GEOPACKAGES, geopackageIds, filePaths)
        }
        this.setupCertificateAuth()
        setTimeout(() => {
          if (this.projectWindowFullScreen) {
            this.projectWindow.setFullScreen(true)
          } else if (this.projectWindowMaximized) {
            this.projectWindow.maximize()
          }
          this.projectWindow.show()

          if (!isNil(this.mainWindow)) {
            this.mainWindow.hide()
            this.mainWindow.destroy()
            this.mainWindow = null
          }
        }, 1500)
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
    const self = this
    const template = [
      {
        label: 'Edit',
        submenu: [
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' }
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
      }
    ]

    template.push({
      label: 'Help',
      submenu: [
        {
          label: 'User guide',
          click () {
            self.launchUserGuideWindow()
          }
        },
        {
          label: 'What\'s New...',
          click () {
            self.launchReleaseNotesWindow()
          }
        }
      ]
    })

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
  showAllDevTools () {
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
    if (this.releaseNotesWindow) {
      this.releaseNotesWindow.webContents.openDevTools()
    }
    if (this.userGuideWindow) {
      this.userGuideWindow.webContents.openDevTools()
    }
  }

  /**
   * Hides all devtools for visible windows
   */
  hideAllDevTools () {
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
    if (this.releaseNotesWindow) {
      this.releaseNotesWindow.webContents.closeDevTools()
    }
    if (this.userGuideWindow) {
      this.userGuideWindow.webContents.closeDevTools()
    }
  }
}

export default new MapCacheWindowManager()
