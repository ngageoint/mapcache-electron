import {app, BrowserWindow, Menu, shell, dialog, ipcMain} from 'electron'
import path from 'path'
import _ from 'lodash'
import { download } from 'electron-dl'
import fileUrl from 'file-url'
import WorkerPool from './WorkerWindowPool'
import Task from './Task'

const isMac = process.platform === 'darwin'

class WindowLauncher {
  mainWindow
  projectWindow
  loadingWindow
  isShuttingDown = false
  quitFromParent = false

  isWindowVisible () {
    return this.mainWindow !== null || this.projectWindow !== null || this.loadingWindow !== null
  }

  start () {
    this.launchLoaderWindow()
    this.launchMainWindow()
    this.launchProjectWindow()
    WorkerPool.launchWorkerWindows()
    this.registerEventHandlers()
  }

  registerEventHandlers () {
    ipcMain.on('show-project', (event, payload) => {
      this.showProject(payload)
    })
    ipcMain.on('close-project', () => {
      this.closeProject()
    })
    ipcMain.on('show_feature_table', (event, id, tableName, isGeoPackage) => {
      event.sender.send('show_feature_table', id, tableName, isGeoPackage)
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

    let windowOptions = {
      title: 'MapCache',
      icon: path.join(__dirname, 'assets', '64x64.png'),
      webPreferences: {
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
        enableRemoteModule: true
      },
      show: false,
      width: 940,
      height: 665,
      minHeight: 665,
      minWidth: 720
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

  launchProjectWindow () {
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
      height: 700,
      minHeight: 700,
      minWidth: 1000,
      useContentSize: true
    }
    this.projectWindow = new BrowserWindow(windowOptions)
    this.projectWindow.on('close', (event) => {
      if (!this.isShuttingDown) {
        let leave = true
        if (WorkerPool.hasTasks()) {
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
        ? `${process.env.WEBPACK_DEV_SERVER_URL}/?id=${projectId}#/project`
        : `app://./index.html?id=${projectId}#project`
      this.loadContent(this.projectWindow, winURL, () => {
        this.projectWindow.show()
        this.mainWindow.send('show-project-completed')
        setTimeout(() => {
          this.mainWindow.hide()
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
            label: 'Learn More',
            click () {
              shell.openExternal('https://github.com/ngageoint/mapcache-electron')
            }
          },
          {
            label: 'Documentation',
            click () {
              shell.openExternal(
                `https://github.com/ngageoint/mapcache-electron/blob/0.0.10/README.md`
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
}

export default new WindowLauncher()
