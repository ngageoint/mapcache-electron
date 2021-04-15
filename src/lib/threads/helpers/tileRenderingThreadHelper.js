import path from 'path'
import WorkerThreadPool from '../pool/workerThreadPool'
// import os from 'os'

/**
 * Helper class that handles calls to the geotiff web worker
 */
export default class TileRenderingThreadHelper {
  threadPool

  constructor () {
    let file = path.join(__dirname, 'tileRenderingThread.js')
    file = file.replace('app.asar', 'app.asar.unpacked')
    this.threadPool = new WorkerThreadPool(1, file)
  }

  hasTasks () {
    return this.threadPool.hasTasks()
  }

  renderTile (tileRequest) {
    return new Promise((resolve, reject) => {
      this.threadPool.addTask(tileRequest, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
  }

  cancelTask (id) {
    // will only attempt to cancel tasks that have not yet started
    this.threadPool.cancelPendingTask(id)
  }

  async terminate () {
    await this.threadPool.close()
  }
}
