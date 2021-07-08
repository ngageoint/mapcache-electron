import { app, BrowserWindow, Menu, shell, dialog, ipcMain, session, globalShortcut } from 'electron'
import path from 'path'
import isNil from 'lodash/isNil'
import MapcacheThreadHelper from '../threads/helpers/mapcacheThreadHelper'
import { getUserCertForUrl } from './auth/CertAuth'
import { getClientCredentials } from './auth/BasicAuth'

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
            webContents.send('cancel-service-request', associatedRequest.url)
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
      if (isNil(headers['Access-Control-Allow-Origin']) || headers['Access-Control-Allow-Origin'] === [ '*' ] || headers['Access-Control-Allow-Origin'] === '*') {
        headers['Access-Control-Allow-Origin'] = isProduction ? 'mapcache://.' : 'http://localhost:8081'
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

  /**
   * Starts the app
   */
  start () {
    this.setupGlobalShortcuts()
    this.setupWebRequestWorkflow()
    this.registerEventHandlers()
    Promise.all([this.registerWorkerThreads(), this.launchMainWindow()]).then(() => {
      this.showMainWindow()
    })
  }

  /**
   * Clear event listeners for worker threads
   */
  static clearWorkerThreadEventHandlers () {
    ipcMain.removeAllListeners('process_source')
    ipcMain.removeAllListeners('cancel_process_source')
    ipcMain.removeAllListeners('attach_media')
    ipcMain.removeAllListeners('request_tile')
    ipcMain.removeAllListeners('cancel_tile_request')
  }

  async registerWorkerThreads () {
    if (this.mapcacheThreadHelper == null) {
      MapCacheWindowManager.clearWorkerThreadEventHandlers()
      this.mapcacheThreadHelper = new MapcacheThreadHelper()
      await this.mapcacheThreadHelper.initialize()
      ipcMain.on('attach_media', async (event, payload) => {
        const taskId = payload.id
        const success = await this.mapcacheThreadHelper.attachMedia(payload)
        event.sender.send('attach_media_completed_' + taskId, success)
      })

      ipcMain.on('process_source', async (event, payload) => {
        const taskId = payload.source.id
        payload.id = taskId
        const result = await this.mapcacheThreadHelper.processDataSource(payload, event.sender)
        if (result && !result.cancelled) {
          event.sender.send('process_source_completed_' + taskId, result)
        }
      })

      ipcMain.on('cancel_process_source', (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.cancelTask(taskId).then(() => {
          event.sender.send('cancel_process_source_completed_' + taskId)
        })
      })

      ipcMain.on('cancel_tile_request', async (event, payload) => {
        const taskId = payload.id
        await this.mapcacheThreadHelper.cancelPendingTask(taskId)
      })

      ipcMain.on('request_tile', async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.renderTile(payload).then(response => {
          event.sender.send('request_tile_' + taskId, {
            base64Image: response
          })
        }).catch(e => {
          event.sender.send('request_tile_' + taskId, {
            error: e
          })
        })
      })

      ipcMain.on('generate_geotiff_raster_file', async (event, payload) => {
        const taskId = payload.id
        this.mapcacheThreadHelper.generateGeoTIFFRaster(payload).then((result) => {
          event.sender.send('generate_geotiff_raster_file_' + taskId, result)
        }).catch(e => {
          event.sender.send('generate_geotiff_raster_file_' + taskId, {
            error: e
          })
        })
      })
    }
  }

  /**
   * Clear event listeners
   */
  static clearEventHandlers () {
    ipcMain.removeAllListeners('get-app-version')
    ipcMain.removeAllListeners('get-user-data-directory')
    ipcMain.removeAllListeners('get-app-data-directory')
    ipcMain.removeAllListeners('open-external')
    ipcMain.removeAllListeners('show-save-dialog')
    ipcMain.removeAllListeners('show-open-dialog')
    ipcMain.removeAllListeners('show-project')
    ipcMain.removeAllListeners('close-project')
    ipcMain.removeAllListeners('process_source')
    ipcMain.removeAllListeners('cancel_process_source')
    ipcMain.removeAllListeners('build_feature_layer')
    ipcMain.removeAllListeners('cancel_build_feature_layer')
    ipcMain.removeAllListeners('build_tile_layer')
    ipcMain.removeAllListeners('cancel_build_tile_layer')
    ipcMain.removeAllListeners('quick_download_geopackage')
    ipcMain.removeAllListeners('attach_media')
    ipcMain.removeAllListeners('request_tile')
  }

  /**
   * Register Event Handlers
   */
  registerEventHandlers () {
    MapCacheWindowManager.clearEventHandlers()

    ipcMain.on('open-external', (event, link) => {
      // this will only be received by the main page.
      // There is a filter in place in the preload script to ensure only the links presented on the landing page can be
      // passed through.
      shell.openExternal(link)
    })

    ipcMain.on('get-app-version', (event) => {
      event.returnValue = app.getVersion()
    })

    ipcMain.on('get-user-data-directory', (event) => {
      event.returnValue = app.getPath('userData')
    })

    ipcMain.on('get-app-data-directory', (event) => {
      event.returnValue = app.getPath('appData')
    })

    ipcMain.on('show-save-dialog', (event, options) => {
      dialog.showSaveDialog(this.projectWindow, options).then(result => event.sender.send('show-save-dialog-completed', result))
    })

    ipcMain.on('show-open-dialog', (event, options) => {
      dialog.showOpenDialog(this.projectWindow, options).then(result => event.sender.send('show-open-dialog-completed', result))
    })

    ipcMain.on('show-project', (event, payload) => {
      this.showProject(payload)
    })

    ipcMain.on('close-project', () => {
      this.forceClose = true
      this.closeProject(true)
    })

    ipcMain.on('quick_download_geopackage', (event, payload) => {
      this.downloadURL(payload.url).then(() => {
      }).catch(() => {
        // eslint-disable-next-line no-console
        console.error('Failed to download GeoPackage.')
      })
    })

    // Utilize BrowserWindow in order to use electron session
    ipcMain.on('build_feature_layer', (event, payload) => {
      const taskId = payload.configuration.id
      const statusCallback = (status) => {
        event.sender.send('build_feature_layer_status_' + taskId, status)
      }
      const completedCallback = () => {
        event.sender.send('build_feature_layer_completed_' + taskId)
      }
      ipcMain.once('worker_build_feature_layer_completed_' + taskId, (event, result) => {
        ipcMain.removeAllListeners('worker_build_feature_layer_status_' + taskId)
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
      ipcMain.on('worker_build_feature_layer_status_' + taskId, (event, status) => {
        statusCallback(status)
      })
      ipcMain.removeAllListeners('worker_ready')
      ipcMain.on('worker_ready', (event) => {
        event.sender.send('worker_build_feature_layer', {
          taskId: payload.configuration.id,
          configuration: payload.configuration
        })
      })
      this.launchWorkerAndExecuteConfiguration()
    })
    ipcMain.on('cancel_build_feature_layer', (event, payload) => {
      const taskId = payload.configuration.id
      ipcMain.removeAllListeners('worker_build_feature_layer_completed_' + taskId)
      ipcMain.removeAllListeners('worker_build_feature_layer_status_' + taskId)
      if (!isNil(this.workerWindow)) {
        this.workerWindow.destroy()
        this.workerWindow = null
      }
      event.sender.send('cancel_build_feature_layer_completed_' + taskId)
    })
    ipcMain.on('build_tile_layer', (event, payload) => {
      const taskId = payload.configuration.id
      const statusCallback = (status) => {
        event.sender.send('build_tile_layer_status_' + taskId, status)
      }
      const completedCallback = () => {
        event.sender.send('build_tile_layer_completed_' + taskId)
      }
      ipcMain.once('worker_build_tile_layer_completed_' + taskId, (event, result) => {
        ipcMain.removeAllListeners('worker_build_tile_layer_status_' + taskId)
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
      ipcMain.on('worker_build_tile_layer_status_' + taskId, (event, status) => {
        statusCallback(status)
      })
      ipcMain.removeAllListeners('worker_ready')
      ipcMain.on('worker_ready', (event) => {
        event.sender.send('worker_build_tile_layer', {
          taskId: payload.configuration.id,
          configuration: payload.configuration
        })
      })
      this.launchWorkerAndExecuteConfiguration()
    })
    ipcMain.on('cancel_build_tile_layer', (event, payload) => {
      const taskId = payload.configuration.id
      ipcMain.removeAllListeners('worker_build_tile_layer_completed_' + taskId)
      ipcMain.removeAllListeners('worker_build_tile_layer_status_' + taskId)
      if (!isNil(this.workerWindow)) {
        this.workerWindow.destroy()
        this.workerWindow = null
      }
      event.sender.send('cancel_build_tile_layer_completed_' + taskId)
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
    if (this.projectWindow) {
      this.projectWindow.webContents.send('closing-project-window', {isDeleting})
      this.launchMainWindow().then(() => {
        this.showMainWindow()
      })
    }
  }

  /**
   * Launches the project window and displays a project
   * @param projectId
   */
  showProject (projectId) {
    try {
      this.launchProjectWindow()
      const winURL = process.env.WEBPACK_DEV_SERVER_URL
        ? `${process.env.WEBPACK_DEV_SERVER_URL}#/project/${projectId}`
        : `mapcache://./index.html/#/project/${projectId}`
      this.loadContent(this.projectWindow, winURL, () => {
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
                `https://github.com/ngageoint/mapcache-electron/blob/v1.1.0/README.md`
              )
            }
          },
          {
            label: 'What\'s New...',
            click () {
              shell.openExternal(
                `https://github.com/ngageoint/mapcache-electron/blob/v1.1.0/changelog/v1.1.0.md`
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
  }
}

export default new MapCacheWindowManager()
