import { app, BrowserWindow, Menu, shell, dialog, ipcMain, session } from 'electron'
import path from 'path'
import isNil from 'lodash/isNil'
import CredentialsManagement from '../network/CredentialsManagement'
import MapcacheThreadHelper from '../../threads/helpers/mapcacheThreadHelper'
import TileRenderingThreadHelper from '../../threads/helpers/tileRenderingThreadHelper'

const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'

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

  // track request id's that have auth for mapcache enabled
  requestAuthEnabledMap = {}
  // timeout functions for requests that have mapcache timeout specified
  requestTimeoutFunctions = {}
  // track redirects
  redirectedRequests = {}
  // certSelectionInProgress
  certSelectionInProgress = false
  // certSelectionMade
  certSelectionMade = false

  // userCredentialRequestInProgress
  userCredentialRequestInProgress = false

  /**
   * Is the app running
   * @returns {boolean}
   */
  isAppRunning () {
    return !isNil(this.mainWindow) || !isNil(this.projectWindow) || !isNil(this.loadingWindow)
  }

  /**
   * Sets up authentication via a certificate
   * TODO: currently this only works once. There is no way to allow a user to select a different certificate.
   *  If no cert is selected, they will not be able to select again
   */
  setupCertificateAuth () {
    app.removeAllListeners('select-client-certificate')
    app.on('select-client-certificate', (event, webContents, url, list, callback) => {
      event.preventDefault()

      if (!this.certSelectionMade && !this.certSelectionInProgress) {
        this.certSelectionCallbacks = true
        ipcMain.removeAllListeners('client-certificate-selected')
        ipcMain.once('client-certificate-selected', (event, item) => {
          callback(item)
          this.certSelectionMade = true
          this.certSelectionInProgress = false
        })
        this.projectWindow.webContents.send('select-client-certificate', {
          url: url,
          certificates: list
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
  }

  /**
   * Sets up the timeout function
   * @param id
   * @param requestId
   * @param timeout
   * @param webContentsId webContentsId
   */
  prepareTimeout (id, requestId, timeout, webContentsId) {
    this.requestTimeoutFunctions[id] = setTimeout(() => {
      const requestCancelChannel = 'request-timeout-' + requestId

      // not sure who made this request, so try sending to both
      if (this.projectWindow && this.projectWindow.webContents.id === webContentsId) {
        this.projectWindow.webContents.send(requestCancelChannel)
      }
      if (this.workerWindow && this.workerWindow.webContents.id === webContentsId) {
        this.workerWindow.webContents.send(requestCancelChannel)
      }
    }, timeout)
  }

  /**
   * Clears timeout function
   * @param id
   */
  clearTimeoutFunction (id) {
    const timeoutFunction = this.requestTimeoutFunctions[id]
    if (!isNil(timeoutFunction)) {
      clearTimeout(timeoutFunction)
      delete this.requestTimeoutFunctions[id]
    }
  }

  /**
   * Sets up the web request workflow. This function handles timeouts and performing auth requests
   */
  setupWebRequestWorkflow () {
    // before sending headers, if it is marked with the auth enabled header, store the id of the request
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = details.requestHeaders
      if (!isNil(headers['x-mapcache-auth-enabled'])) {
        this.requestAuthEnabledMap[details.id] = true
      }
      // set timeout function if timeout is provided and this isn't a redirected request
      if (isNil(this.redirectedRequests[details.id]) && !isNil(headers['x-mapcache-connection-id']) && !isNil(headers['x-mapcache-timeout'])) {
        const requestId = headers['x-mapcache-connection-id']
        const timeout = parseInt(headers['x-mapcache-timeout'])
        if (timeout > 0) {
          this.prepareTimeout(details.id, requestId, timeout, details.webContentsId)
        }
      }
      delete headers['x-mapcache-auth-enabled']
      delete headers['x-mapcache-timeout']
      delete headers['x-mapcache-connection-id']
      callback({
        requestHeaders: headers
      })
    })

    // if auth was enabled, be sure to add response header allow for auth to occur
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      this.clearTimeoutFunction(details.id)
      let headers = details.responseHeaders
      if (!isNil(this.requestAuthEnabledMap[details.id])) {
        headers['x-mapcache-auth-enabled'] = ['enabled']
      }
      callback({
        responseHeaders: headers
      })
    })

    session.defaultSession.webRequest.onBeforeRedirect((details) => {
      this.redirectedRequests[details.id] = true
    })

    // once completed, we need to delete the map's id to prevent memory leak
    session.defaultSession.webRequest.onCompleted(details => {
      delete this.requestAuthEnabledMap[details.id]
      delete this.requestTimeoutFunctions[details.id]
      delete this.redirectedRequests[details.id]
    })
    session.defaultSession.webRequest.onErrorOccurred(details => {
      delete this.requestAuthEnabledMap[details.id]
      delete this.requestTimeoutFunctions[details.id]
      delete this.redirectedRequests[details.id]
    })
  }

  /**
   * Starts the app
   */
  start () {
    this.setupWebRequestWorkflow()
    this.launchLoaderWindow()
    this.launchMainWindow()
    this.registerEventHandlers()
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
    ipcMain.removeAllListeners('read_raster')
    ipcMain.removeAllListeners('cancel_read_raster')
    ipcMain.removeAllListeners('attach_media')
    ipcMain.removeAllListeners('request_tile')
  }

  /**
   * Register Event Handlers
   */
  registerEventHandlers () {
    MapCacheWindowManager.clearEventHandlers()

    ipcMain.on('open-external', (event, link) => {
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
        // eslint-disable-next-line no-unused-vars
      }).catch(e => {
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
      ipcMain.once('worker_build_feature_layer_completed_' + taskId, (e) => {
        ipcMain.removeAllListeners('worker_build_feature_layer_status_' + taskId)
        if (!isNil(this.workerWindow)) {
          this.workerWindow.destroy()
          this.workerWindow = null
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
      ipcMain.once('worker_build_tile_layer_completed_' + taskId, (event) => {
        ipcMain.removeAllListeners('worker_build_tile_layer_status_' + taskId)
        if (!isNil(this.workerWindow)) {
          this.workerWindow.destroy()
          this.workerWindow = null
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

    this.mapcacheThreadHelper = new MapcacheThreadHelper()
    ipcMain.on('attach_media', async (event, payload) => {
      const taskId = payload.id
      const success = await this.mapcacheThreadHelper.attachMedia(payload)
      event.sender.send('attach_media_completed_' + taskId, success)
    })

    ipcMain.on('process_source', async (event, payload) => {
      const taskId = payload.source.id
      payload.id = taskId
      const result = await this.mapcacheThreadHelper.processDataSource(payload)
      event.sender.send('process_source_completed_' + taskId, result)
    })

    ipcMain.on('cancel_process_source', (event, payload) => {
      const taskId = payload.id
      this.mapcacheThreadHelper.cancelTask(taskId).then(() => {
        event.sender.send('cancel_process_source_completed_' + taskId)
      })
    })

    this.tileRenderingThreadHelper = new TileRenderingThreadHelper()
    ipcMain.on('cancel_tile_request', async (event, payload) => {
      const taskId = payload.id
      this.tileRenderingThreadHelper.cancelTask(taskId)
    })
    ipcMain.on('request_tile', async (event, payload) => {
      const taskId = payload.id
      try {
        const response = await this.tileRenderingThreadHelper.renderTile(payload)
        event.sender.send('request_tile_' + taskId, {
          base64Image: response
        })
      } catch (e) {
        event.sender.send('request_tile_' + taskId, {
          error: e
        })
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
    MapCacheWindowManager.disableCertificateAuth()
    try {
      if (!isNil(this.mapcacheThreadHelper)) {
        await this.mapcacheThreadHelper.terminate()
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
    try {
      if (!isNil(this.tileRenderingThreadHelper)) {
        await this.tileRenderingThreadHelper.terminate()
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
    // eslint-disable-next-line no-unused-vars
    window.loadURL(url).then(onFulfilled).catch((e) => {
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
      : 'app://./index.html/#/worker'

    let windowOptions = {
      webPreferences: {
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
        nodeIntegrationInWorker: process.env.ELECTRON_NODE_INTEGRATION,
        contextIsolation: false,
        webSecurity: false,
        preload: path.join(__dirname, 'workerPreload.js')
      },
      show: false
    }
    this.workerWindow = new BrowserWindow(windowOptions)
    this.loadContent(this.workerWindow, workerURL, () => {})
  }

  /**
   * Launches the main window (LandingPage)
   */
  launchMainWindow () {
    const winURL = process.env.NODE_ENV === 'development'
      ? `${process.env.WEBPACK_DEV_SERVER_URL}`
      : `app://./index.html`

    const menu = Menu.buildFromTemplate(this.getMenuTemplate())
    Menu.setApplicationMenu(menu)

    const windowHeight = 620 + (isWin ? 20 : 0)

    let windowOptions = {
      title: 'MapCache',
      icon: path.join(__dirname, 'assets', '64x64.png'),
      webPreferences: {
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
        nodeIntegrationInWorker: process.env.ELECTRON_NODE_INTEGRATION,
        contextIsolation: false,
        webSecurity: false,
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
    }

    this.mainWindow = new BrowserWindow(windowOptions)
    this.mainWindow.setMenu(menu)
    this.loadContent(this.mainWindow, winURL, () => {
      if (!isNil(this.loadingWindow)) {
        this.loadingWindow.hide()
        this.loadingWindow.destroy()
        this.loadingWindow = null
      }
      if (!isNil(this.projectWindow)) {
        this.projectWindow.hide()
        this.projectWindow.destroy()
        this.projectWindow = null
      }
      this.mainWindow.show()
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
  }

  /**
   * Launches the loader window
   */
  launchLoaderWindow () {
    const winURL = process.env.WEBPACK_DEV_SERVER_URL
      ? `${process.env.WEBPACK_DEV_SERVER_URL}/loader.html`
      : `app://./loader.html`
    let windowOptions = {
      frame: false,
      width: 256,
      height: 256,
      transparent: true,
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
    this.loadingWindow = new BrowserWindow(windowOptions)
    setTimeout(() => {
      this.loadContent(this.loadingWindow, winURL)
    }, 0)
  }

  /**
   * Launches the project window
   */
  launchProjectWindow () {
    const windowHeight = 700 + (isWin ? 20 : 0)

    let windowOptions = {
      title: 'MapCache',
      icon: path.join(__dirname, 'assets', '64x64.png'),
      webPreferences: {
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
        nodeIntegrationInWorker: process.env.ELECTRON_NODE_INTEGRATION,
        contextIsolation: false,
        webSecurity: false,
        preload: path.join(__dirname, 'projectPreload.js')
      },
      show: false,
      width: 1200,
      height: windowHeight,
      minHeight: windowHeight,
      minWidth: 1000,
      useContentSize: true
    }
    this.projectWindow = new BrowserWindow(windowOptions)
    this.projectWindow.on('close', (event) => {
      if (!this.isShuttingDown) {
        let leave = true
        let hasTasks = !isNil(this.workerWindow) || this.mapcacheThreadHelper.hasTasks() || this.tileRenderingThreadHelper.hasTasks()
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

    this.projectWindow.webContents.removeAllListeners('login')
    this.projectWindow.webContents.on('login', (event, details, authInfo, callback) => {
      if (details.firstAuthAttempt && (!isNil(details.responseHeaders) && !isNil(details.responseHeaders['x-mapcache-auth-enabled']))) {
        event.preventDefault()
        if (!this.userCredentialRequestInProgress) {
          this.userCredentialRequestInProgress = true
          ipcMain.removeAllListeners('client-credentials-input')
          ipcMain.once('client-credentials-input', async (event, credentials) => {
            this.userCredentialRequestInProgress = false
            if (credentials === null || credentials === undefined) {
              callback()
            } else {
              callback(credentials.username, await CredentialsManagement.decrypt(credentials.password, credentials.iv, credentials.key))
            }
          })
          this.projectWindow.webContents.send('request-client-credentials', {
            authInfo: authInfo,
            details: details
          })
        } else {
          callback()
        }
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
      this.launchMainWindow()
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
        : `app://./index.html/#/project/${projectId}`
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
    const viewSubmenu = [
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'togglefullscreen' },
      { role: 'toggledevtools' }
    ]

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
        submenu: viewSubmenu
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
                `https://github.com/ngageoint/mapcache-electron/blob/v1.0.8/README.md`
              )
            }
          },
          {
            label: 'What\'s New...',
            click () {
              shell.openExternal(
                `https://github.com/ngageoint/mapcache-electron/blob/v1.0.8/changelog/v1.0.8.md`
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
