import { BrowserWindow } from 'electron'
import _ from 'lodash'
import os from 'os'

class WorkerWindowPool {
  windowPoolSize = Math.min(os.cpus().length, 4)
  workerWindows = []
  activeTasks = {}
  queue = []
  running = 0

  /**
   * Destroy worker windows
   */
  quit() {
    this.cancelTasks().then(() => {
      for (let i = 0; i < this.workerWindows.length; i++) {
        this.workerWindows[i].window.destroy()
      }
    })
  }

  /**
   * Shows all workers dev tools
   */
  showAllDevTools() {
    for (let i = 0; i < this.workerWindows.length; i++) {
      this.workerWindows[i].window.webContents.openDevTools()
    }
  }

  /**
   * Hides all workers dev tools
   */
  hideAllDevTools() {
    for (let i = 0; i < this.workerWindows.length; i++) {
      this.workerWindows[i].window.webContents.closeDevTools()
    }
  }

  /**
   * Worker pool has ongoing tasks
   * @returns {boolean}
   */
  hasTasks() {
    return this.running + this.queue.length > 0
  }

  /**
   * Worker has completed, check for remaining tasks
   */
  next() {
    this.running--
    this.start()
  }

  /**
   * Try to execute tasks
   * @returns {boolean}
   */
  async start() {
    // too many tasks are running, need to wait for one to complete
    if (this.running >= this.windowPoolSize) {
      return true
    }
    const task = this.queue.shift()
    // no tasks left
    if (!task) {
      return false
    }
    this.running++
    const worker = await this.getOrWaitForAvailableWorker()
    this.activeTasks[task.id] = {
      task: task,
      worker: worker
    }
    task.fn(worker).then((result) => {
      task.cb(result)
      delete this.activeTasks[task.id]
      worker.available = true
      this.next()
    }).catch(e => {
      task.error(e)
      delete this.activeTasks[task.id]
      worker.available = true
      this.next()
    })
    return true
  }

  /**
   * Add task to queue
   * @param task
   */
  addTask(task) {
    this.queue.push(task)
    this.start()
  }

  /**
   * Cancels a task if it exists and hasn't already finished
   * @param taskId
   */
  async cancelTask(taskId) {
    // task is active
    const activeTask = this.activeTasks[taskId]
    if (!_.isNil(activeTask)) {
      activeTask.task.cancel()
      try {
        await this.restartWorkerWindow(activeTask.worker.id)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Unable to restart worker window.')
      }
      delete this.activeTasks[taskId]
    } else {
      // try to remove it from queue
      this.queue = this.queue.filter(task => task.id !== taskId)
    }
    this.next()
  }

  /**
   * Cancel any unstarted or ongoing tasks
   */
  async cancelTasks() {
    this.queue = []
    for (let key of _.keys(this.activeTasks)) {
      this.cancelTask(key)
    }
  }

  /**
   * Load worker page
   * @param window
   * @param url
   * @param onFulfilled
   */
  loadContent(window, url, onFulfilled = () => {
  }) {
    window.loadURL(url).then(onFulfilled).catch((e) => {
      // eslint-disable-next-line no-console
      console.error('Unable to load worker.')
    })
  }

  /**
   * Initialize the worker pool
   */
  launchWorkerWindows() {
    // create hidden worker window
    for (let id = 0; id < this.windowPoolSize; id++) {
      const workerURL = process.env.WEBPACK_DEV_SERVER_URL
        ? `${process.env.WEBPACK_DEV_SERVER_URL}#/worker/${id}`
        : `app://./index.html/#/worker/${id}`

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

  /**
   * Restart a worker
   * @param id
   * @returns {Promise<*>}
   */
  async restartWorkerWindow(id) {
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
            ? `${process.env.WEBPACK_DEV_SERVER_URL}#/worker/${id}`
            : `app://./index.html/#/worker/${id}`
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

  /**
   * Will try to acquire a worker and will continue to wait until one becomes available
   * @returns {Promise<null>}
   */
  async getOrWaitForAvailableWorker() {
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
    return availableWorker
  }
}
export default new WorkerWindowPool()
