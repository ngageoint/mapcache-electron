import {BrowserWindow, ipcMain} from 'electron'
import _ from 'lodash'

class WorkerWindowPool {
  windowPoolSize = 4
  workerWindows = []
  workerWindowAssignment = {}

  quit () {
    for (let i = 0; i < this.workerWindows.length; i++) {
      this.workerWindows[i].window.destroy()
    }
  }

  loadContent (window, url, onFulfilled = () => {}) {
    window.loadURL(url).then(onFulfilled).catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e)
    })
  }

  launchWorkerWindows () {
    // create hidden worker window
    for (let id = 0; id < this.windowPoolSize; id++) {
      const workerURL = process.env.WEBPACK_DEV_SERVER_URL
        ? `${process.env.WEBPACK_DEV_SERVER_URL}?id=${id}#/worker`
        : `app://./index.html?id=${id}#worker`

      let worker = {
        id: id,
        window: new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
            nodeIntegrationInWorker: process.env.ELECTRON_NODE_INTEGRATION,
            enableRemoteModule: true,
            webSecurity: false
          }
        }),
        available: false
      }
      if (process.env.WEBPACK_DEV_SERVER_URL) {
        worker.window.toggleDevTools()
      }
      this.workerWindows.push(worker)
      this.loadContent(worker.window, workerURL)
      worker.window.on('ready-to-show', () => {
        worker.available = true
      })
    }
  }

  async restartWorkerWindow (id) {
    return new Promise(resolve => {
      const workerWindow = this.workerWindows.find(worker => worker.id === id)
      if (workerWindow) {
        workerWindow.available = false
        workerWindow.window.on('closed', () => {
          workerWindow.window = new BrowserWindow({
            show: false,
            webPreferences: {
              nodeIntegration: true,
              enableRemoteModule: true,
              webSecurity: false
            }
          })
          const workerURL = process.env.WEBPACK_DEV_SERVER_URL
            ? `${process.env.WEBPACK_DEV_SERVER_URL}?id=${id}#/worker`
            : `app://./index.html?id=${id}#worker`
          this.loadContent(workerWindow.window, workerURL)
          workerWindow.window.on('ready-to-show', () => {
            workerWindow.available = true
            resolve()
          })
          if (process.env.WEBPACK_DEV_SERVER_URL) {
            workerWindow.window.toggleDevTools()
          }
        })
        workerWindow.window.destroy()
      } else {
        resolve()
      }
    })
  }

  async getOrWaitForAvailableWorker (sourceId) {
    const sleep = m => new Promise(resolve => setTimeout(resolve, m))
    let availableWorker = null
    while (_.isNil(availableWorker)) {
      for (let i = 0; i < this.workerWindows.length; i++) {
        const worker = this.workerWindows[i]
        if (worker.available === true) {
          availableWorker = worker
          break
        }
      }
      // sleep so we don't lock down the application
      if (_.isNil(availableWorker)) {
        await sleep(500)
      }
    }
    availableWorker.available = false
    this.workerWindowAssignment[sourceId] = availableWorker
    return availableWorker
  }

  releaseWorker (worker, sourceId) {
    worker.available = true
    delete this.workerWindowAssignment[sourceId]
  }

  async executeProcessSource (payload) {
    const workerWindow = await this.getOrWaitForAvailableWorker()
    return new Promise(resolve => {
      this.workerWindowAssignment[payload.source.id] = workerWindow
      workerWindow.window.webContents.send('worker_process_source', payload)
      ipcMain.once('worker_process_source_completed_' + workerWindow.id, (event, result) => {
        this.releaseWorker(workerWindow, payload.source.id)
        resolve(result)
      })
    })
  }

  async cancelProcessSource (sourceId) {
    return new Promise(resolve => {
      if (this.workerWindowAssignment[sourceId]) {
        const workerWindow = this.workerWindowAssignment[sourceId]
        if (workerWindow) {
          ipcMain.removeAllListeners('worker_process_source_completed_' + workerWindow.id)
          this.restartWorkerWindow(workerWindow.id).then(() => {
            delete this.workerWindowAssignment[sourceId]
            resolve()
          })
        } else {
          resolve()
        }
      } else {
        resolve()
      }
    })
  }

  async executeBuildFeatureLayer (payload, statusCallback) {
    const workerWindow = await this.getOrWaitForAvailableWorker()
    return new Promise(resolve => {
      this.workerWindowAssignment[payload.configuration.id] = workerWindow
      workerWindow.window.webContents.send('worker_build_feature_layer', payload)
      ipcMain.once('worker_build_feature_layer_completed_' + workerWindow.id, (event, result) => {
        ipcMain.removeAllListeners('worker_build_feature_layer_status_' + workerWindow.id)
        this.releaseWorker(workerWindow, payload.configuration.id)
        resolve(result)
      })
      ipcMain.on('worker_build_feature_layer_status_' + workerWindow.id, (event, status) => {
        statusCallback(status)
      })
    })
  }

  cancelBuildFeatureLayer (payload) {
    return new Promise(resolve => {
      try {
        if (this.workerWindowAssignment[payload.configuration.id]) {
          const workerWindow = this.workerWindowAssignment[payload.configuration.id]
          if (workerWindow) {
            ipcMain.removeAllListeners('worker_build_feature_layer_status_' + workerWindow.id)
            this.restartWorkerWindow(workerWindow.id).then(() => {
              delete this.workerWindowAssignment[payload.configuration.id]
              resolve()
            })
          } else {
            resolve()
          }
        } else {
          resolve()
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
        resolve()
      }
    })
  }

  async executeBuildTileLayer (payload, statusCallback) {
    const workerWindow = await this.getOrWaitForAvailableWorker()
    return new Promise(resolve => {
      this.workerWindowAssignment[payload.configuration.id] = workerWindow
      workerWindow.window.webContents.send('worker_build_tile_layer', payload)
      ipcMain.once('worker_build_tile_layer_completed_' + workerWindow.id, (event, result) => {
        ipcMain.removeAllListeners('worker_build_tile_layer_status_' + workerWindow.id)
        this.releaseWorker(workerWindow, payload.configuration.id)
        resolve(result)
      })
      ipcMain.on('worker_build_tile_layer_status_' + workerWindow.id, (event, status) => {
        statusCallback(status)
      })
    })
  }

  async readRaster (payload) {
    const workerWindow = await this.getOrWaitForAvailableWorker()
    return new Promise(resolve => {
      this.workerWindowAssignment[payload.id] = workerWindow
      ipcMain.once('worker_read_raster_completed_' + workerWindow.id, (event, result) => {
        this.releaseWorker(workerWindow, payload.id)
        resolve(result)
      })
      workerWindow.window.webContents.send('worker_read_raster', payload)
    })
  }

  cancelBuildTileLayer (payload) {
    return new Promise(resolve => {
      try {
        if (this.workerWindowAssignment[payload.configuration.id]) {
          const workerWindow = this.workerWindowAssignment[payload.configuration.id]
          if (workerWindow) {
            ipcMain.removeAllListeners('worker_build_tile_layer_status_' + workerWindow.id)
            this.restartWorkerWindow(workerWindow.id).then(() => {
              delete this.workerWindowAssignment[payload.configuration.id]
              resolve()
            })
          } else {
            resolve()
          }
        } else {
          resolve()
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
        resolve()
      }
    })
  }
}
export default new WorkerWindowPool()
