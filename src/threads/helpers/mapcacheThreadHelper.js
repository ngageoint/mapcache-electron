import path from 'path'
import WorkerThreadPool from '../pool/workerThreadPool'
import os from 'os'

/**
 * Helper class that handles calls to the geotiff web worker
 */
export default class MapcacheThreadHelper {
  threadPool

  constructor () {
    let file = path.join(__dirname, 'mapcacheThread.js')
    file = file.replace('app.asar', 'app.asar.unpacked')
    this.threadPool = new WorkerThreadPool(Math.min(2, os.cpus().length), file)
  }

  hasTasks () {
    return this.threadPool.hasTasks()
  }

  attachMedia (data) {
    return new Promise((resolve, reject) => {
      this.threadPool.addTask({type: 'attach_media', data: data}, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
  }

  processDataSource (data) {
    return new Promise((resolve, reject) => {
      this.threadPool.addTask({type: 'process_source', data: data}, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
  }

  async cancelTask (id) {
    await this.threadPool.cancelTask(id)
  }

  async terminate () {
    await this.threadPool.close()
  }
}
