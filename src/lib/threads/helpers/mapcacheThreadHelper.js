import path from 'path'

/**
 * MapcacheThreadHelper
 */
export default class MapcacheThreadHelper {
  threadPool

  constructor () {
    let file = path.join(__dirname, 'mapcacheThread.js')
    file = file.replace('app.asar', 'app.asar.unpacked')
    const os = require('os')
    const WorkerThreadPool = require('../pool/workerThreadPool').default
    this.threadPool = new WorkerThreadPool(Math.min(4, os.cpus().length), file)
  }

  async initialize () {
    return this.threadPool.initialize()
  }

  /**
   * Returns whether the threadpool has any pending or active tasks
   * @returns {boolean}
   */
  hasTasks () {
    return this.threadPool.hasTasks()
  }

  /**
   * Attaches media to a geopackage
   * @param data
   * @returns {Promise<unknown>}
   */
  attachMedia (data) {
    return new Promise((resolve) => {
      this.threadPool.addTask({id: data.id, type: 'attach_media', data: data}, (err, result) => {
        if (err) {
          result = { error: err }
        }
        resolve(result)
      })
    })
  }

  /**
   * Processes a data source
   * @param data
   * @returns {Promise<unknown>}
   */
  processDataSource (data) {
    return new Promise((resolve) => {
      // set up initial directory
      const directory = data.source.directory
      this.threadPool.addTask({id: data.id, type: 'process_source', data: data}, (err, result) => {
        const isNil = require('lodash/isNil')
        if (!isNil(err)) {
          if (isNil(result)) {
            result = {}
          }
          result.error = err
          const { rmDirAsync } = require('../../util/FileUtilities')
          rmDirAsync(directory).then((err) => {
            if (err) {
              console.error('Failed to delete source directory.')
            }
            resolve(result)
          })
        }
        resolve(result)
      }, () => {
        const { rmDirAsync } = require('../../util/FileUtilities')
        rmDirAsync(directory).then((err) => {
          if (err) {
            console.error('Failed to delete source directory.')
          }
          resolve({cancelled: true})
        })
      })
    })
  }

  /**
   * Renders a tile
   * @param data
   * @returns {Promise<unknown>}
   */
  renderTile (data) {
    return new Promise((resolve) => {
      this.threadPool.addTask({id: data.id, type: 'render_tile', data: data}, (err, result) => {
        if (err) {
          result = { error: err }
        }
        resolve(result)
      })
    })
  }

  takeSnapshot () {
    this.threadPool.takeSnapshot()
  }

  gc () {
    this.threadPool.gc()
  }

  /**
   * Cancels a task, will terminate the thread running the task, if needed
   * @param id
   * @returns {Promise<void>}
   */
  async cancelTask (id) {
    await this.threadPool.cancelTask(id)
  }

  /**
   * Cancels a pending task
   * @param id
   * @returns {Promise<void>}
   */
  async cancelPendingTask (id) {
    await this.threadPool.cancelPendingTask(id)
  }

  /**
   * Terminates the thread pool and all of it's threads
   * @returns {Promise<void>}
   */
  async terminate () {
    await this.threadPool.close()
  }
}
