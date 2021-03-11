import {app, BrowserWindow, Menu, shell, dialog, ipcMain, session} from 'electron'
import path from 'path'
import _ from 'lodash'
import { download } from 'electron-dl'
import fileUrl from 'file-url'
import WorkerPool from './WorkerWindowPool'
import Task from './Task'
import CredentialsManagement from '../CredentialsManagement'

const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'

class WindowLauncher {
  mainWindow
  projectWindow
  loadingWindow
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

  isWindowVisible () {
    return this.mainWindow !== null || this.projectWindow !== null || this.loadingWindow !== null
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

  static disableCertificateAuth () {
    app.removeAllListeners('select-client-certificate')
  }

  /**
   * Sets up the timeout function
   * @param id
   * @param requestId
   * @param timeout
   * @param requestOrigin either id of worker, or -1 for project window
   */
  prepareTimeout (id, requestId, timeout, requestOrigin) {
    this.requestTimeoutFunctions[id] = setTimeout(() => {
      const requestCancelChannel = 'request-timeout-' + requestId

      const browserWindow = BrowserWindow.fromId(requestOrigin)
      if (!_.isNil(browserWindow)) {
        browserWindow.webContents.send(requestCancelChannel)
      }
    }, timeout)
  }

  /**
   * Clears timeout function
   * @param id
   */
  clearTimeoutFunction (id) {
    const timeoutFunction = this.requestTimeoutFunctions[id]
    if (!_.isNil(timeoutFunction)) {
      clearTimeout(timeoutFunction)
      delete this.requestTimeoutFunctions[id]
    }
  }

  setupWebRequestWorkflow () {
    // before sending headers, if it is marked with the auth enabled header, store the id of the request
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = details.requestHeaders
      if (!_.isNil(headers['x-mapcache-auth-enabled'])) {
        this.requestAuthEnabledMap[details.id] = true
      }
      // set timeout function if timeout is provided and this isn't a redirected request
      if (_.isNil(this.redirectedRequests[details.id]) && !_.isNil(headers['x-mapcache-connection-id']) && !_.isNil(headers['x-mapcache-timeout'])) {
        const requestId = headers['x-mapcache-connection-id']
        const requestOrigin = parseInt(headers['x-mapcache-request-origin'])
        const timeout = parseInt(headers['x-mapcache-timeout'])
        if (timeout > 0) {
          this.prepareTimeout(details.id, requestId, timeout, requestOrigin)
        }
      }
      delete headers['x-mapcache-auth-enabled']
      delete headers['x-mapcache-timeout']
      delete headers['x-mapcache-request-origin']
      delete headers['x-mapcache-connection-id']
      callback({
        requestHeaders: headers
      })
    })

    // if auth was enabled, be sure to add response header allow for auth to occur
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      this.clearTimeoutFunction(details.id)
      let headers = details.responseHeaders
      if (!_.isNil(this.requestAuthEnabledMap[details.id])) {
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

  start () {
    this.setupWebRequestWorkflow()
    this.launchLoaderWindow()
    this.launchMainWindow()
    this.launchProjectWindow()
    WorkerPool.launchWorkerWindows()
    this.registerEventHandlers()
  }

  registerEventHandlers () {
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

    ipcMain.on('show-project', (event, payload) => {
      this.showProject(payload)
    })
    ipcMain.on('close-project', () => {
      this.forceClose = true
      this.closeProject()
    })
    ipcMain.on('process_source', (event, payload) => {
      const taskId = payload.source.id
      const task = new Task(taskId, event, (worker) => {
        return new Promise(resolve => {
          payload.taskId = taskId
          worker.window.webContents.send('worker_process_source', payload)
          ipcMain.once('worker_process_source_completed_' + taskId, (event, result) => {
            resolve(result)
          })
        })
      }, (result) => {
        event.sender.send('process_source_completed_' + taskId, result)
      }, () => {
        ipcMain.removeAllListeners('worker_process_source_completed_' + taskId)
      })
      WorkerPool.addTask(task)
    })
    ipcMain.on('cancel_process_source', (event, payload) => {
      const taskId = payload.id
      WorkerPool.cancelTask(taskId).then(() => {
        event.sender.send('cancel_process_source_completed_' + taskId)
      })
    })
    ipcMain.on('build_feature_layer', (event, payload) => {
      const taskId = payload.configuration.id
      const task = new Task(taskId, event, (worker) => {
        return new Promise(resolve => {
          payload.taskId = taskId
          const statusCallback = (status) => {
            event.sender.send('build_feature_layer_status_' + taskId, status)
          }
          worker.window.webContents.send('worker_build_feature_layer', payload)
          ipcMain.once('worker_build_feature_layer_completed_' + taskId, (event, result) => {
            ipcMain.removeAllListeners('worker_build_feature_layer_status_' + taskId)
            resolve(result)
          })
          ipcMain.on('worker_build_feature_layer_status_' + taskId, (event, status) => {
            statusCallback(status)
          })
        })
      }, (result) => {
        event.sender.send('build_feature_layer_completed_' + taskId, result)
      }, () => {
        ipcMain.removeAllListeners('worker_build_feature_layer_completed_' + taskId)
        ipcMain.removeAllListeners('worker_build_feature_layer_status_' + taskId)
      })
      WorkerPool.addTask(task)
    })
    ipcMain.on('cancel_build_feature_layer', (event, payload) => {
      const taskId = payload.configuration.id
      WorkerPool.cancelTask(taskId).then(() => {
        event.sender.send('cancel_build_feature_layer_completed_' + taskId)
      })
    })
    ipcMain.on('build_tile_layer', (event, payload) => {
      const taskId = payload.configuration.id
      const task = new Task(taskId, event, (worker) => {
        return new Promise(resolve => {
          payload.taskId = taskId
          const statusCallback = (status) => {
            event.sender.send('build_tile_layer_status_' + taskId, status)
          }
          worker.window.webContents.send('worker_build_tile_layer', payload)
          ipcMain.once('worker_build_tile_layer_completed_' + taskId, (event, result) => {
            ipcMain.removeAllListeners('worker_build_tile_layer_status_' + taskId)
            resolve(result)
          })
          ipcMain.on('worker_build_tile_layer_status_' + taskId, (event, status) => {
            statusCallback(status)
          })
        })
      }, (result) => {
        event.sender.send('build_tile_layer_completed_' + taskId, result)
      }, () => {
        ipcMain.removeAllListeners('worker_build_tile_layer_completed_' + taskId)
        ipcMain.removeAllListeners('worker_build_tile_layer_status_' + taskId)
      })
      WorkerPool.addTask(task)
    })
    ipcMain.on('cancel_build_tile_layer', (event, payload) => {
      const taskId = payload.configuration.id
      WorkerPool.cancelTask(taskId).then(() => {
        event.sender.send('cancel_build_tile_layer_completed_' + taskId)
      })
    })
    ipcMain.on('quick_download_geopackage', (event, payload) => {
      this.downloadURL(payload.url).then(() => {
      }).catch(e => {
        // eslint-disable-next-line no-console
        console.error(e)
      })
    })
    ipcMain.on('read_raster', (event, payload) => {
      const taskId = payload.id
      const task = new Task(taskId, event, (workerWindow) => {
        return new Promise(resolve => {
          payload.taskId = taskId
          workerWindow.window.webContents.send('worker_read_raster', payload)
          ipcMain.once('worker_read_raster_completed_' + taskId, (event, result) => {
            resolve(result)
          })
        })
      }, (result) => {
        event.sender.send('read_raster_completed_' + taskId, {rasters: result})
      }, () => {
        ipcMain.removeAllListeners('worker_read_raster_completed_' + taskId)
      })
      WorkerPool.addTask(task)
    })
    ipcMain.on('cancel_read_raster', async (event, payload) => {
      const taskId = payload.id
      await WorkerPool.cancelTask(taskId)
    })
    ipcMain.on('attach_media', (event, payload) => {
      const taskId = payload.id
      const task = new Task(taskId, event, (workerWindow) => {
        return new Promise(resolve => {
          payload.taskId = taskId
          workerWindow.window.webContents.send('worker_attach_media', payload)
          ipcMain.once('worker_attach_media_completed_' + taskId, (event, result) => {
            resolve(result)
          })
        })
      }, (result) => {
        event.sender.send('attach_media_completed_' + taskId, result)
      }, () => {
        ipcMain.removeAllListeners('worker_attach_media_completed_' + taskId)
      })
      WorkerPool.addTask(task)
    })
  }

  quit () {
    this.quitFromParent = true
    this.isShuttingDown = true
    WorkerPool.quit()
    if (!_.isNil(this.mainWindow)) {
      this.mainWindow.destroy()
    }
    if (!_.isNil(this.projectWindow)) {
      this.projectWindow.destroy()
    }
    if (!_.isNil(this.loadingWindow)) {
      this.loadingWindow.destroy()
    }
  }

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
        enableRemoteModule: true,
        webSecurity: false
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
    // mainWindowState.track(this.mainWindow)
    this.loadContent(this.mainWindow, winURL, () => {
      this.loadingWindow.hide()
      this.mainWindow.show()
    })
    this.mainWindow.on('close', () => {
      if (!this.quitFromParent) {
        app.quit()
      } else {
        this.isShuttingDown = true
        if (this.projectWindow !== null) {
          this.projectWindow.destroy()
        }
        this.mainWindow = null
      }
    })
  }

  loadContent (window, url, onFulfilled = () => {}) {
    window.loadURL(url).then(onFulfilled).catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e)
    })
  }

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

  getProjectWindow () {
    return this.projectWindow
  }

  launchProjectWindow () {
    const windowHeight = 700 + (isWin ? 20 : 0)

    let windowOptions = {
      title: 'MapCache',
      icon: path.join(__dirname, 'assets', '64x64.png'),
      webPreferences: {
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
        nodeIntegrationInWorker: process.env.ELECTRON_NODE_INTEGRATION,
        enableRemoteModule: true,
        webSecurity: false
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
        if (WorkerPool.hasTasks() && !this.forceClose) {
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
          WindowLauncher.disableCertificateAuth()
          WorkerPool.cancelTasks()
          this.mainWindow.show()
          this.launchProjectWindow()
        } else {
          event.preventDefault()
        }
      } else {
        this.projectWindow = null
      }
    })

    this.projectWindow.webContents.removeAllListeners('login')
    this.projectWindow.webContents.on('login', (event, details, authInfo, callback) => {
      if (details.firstAuthAttempt && (!_.isNil(details.responseHeaders) && !_.isNil(details.responseHeaders['x-mapcache-auth-enabled']))) {
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

  downloadURL = async (url) => {
    try {
      await download(this.projectWindow, fileUrl(url))
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
  }

  closeProject() {
    if (this.projectWindow !== null) {
      this.projectWindow.close()
    }
  }

  showProject (projectId) {
    try {
      const winURL = process.env.WEBPACK_DEV_SERVER_URL
        ? `${process.env.WEBPACK_DEV_SERVER_URL}#/project/${projectId}`
        : `app://./index.html/#/project/${projectId}`
      this.loadContent(this.projectWindow, winURL, () => {
        this.projectWindow.show()
        this.mainWindow.send('show-project-completed')
        setTimeout(() => {
          this.mainWindow.hide()
          this.setupCertificateAuth()
        }, 250)
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }

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

  showAllDevTools() {
    if (this.projectWindow) {
      this.projectWindow.webContents.openDevTools()
    } else {
      this.mainWindow.webContents.openDevTools()
    }
    WorkerPool.showAllDevTools()
  }

  hideAllDevTools() {
    if (this.projectWindow) {
      this.projectWindow.webContents.closeDevTools()
    } else {
      this.mainWindow.webContents.closeDevTools()
    }
    WorkerPool.hideAllDevTools()
  }
}

export default new WindowLauncher()
