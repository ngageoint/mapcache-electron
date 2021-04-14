import path from 'path'
import ProcessPool from '../pool/processPool'
import os from 'os'

/**
 * Handles setting up process pool for tile rendering requests
 */
export default class TileRenderingProcessHelper {
  processPool

  constructor () {
    let file = path.join(__dirname, 'tileRenderingProcess.js')
    file = file.replace('app.asar', 'app.asar.unpacked')
    this.processPool = new ProcessPool(Math.min(4, os.cpus().length), file)
  }

  hasTasks () {
    return this.processPool.hasTasks()
  }

  renderTile (tileRequest) {
    return new Promise((resolve, reject) => {
      this.processPool.addTask(tileRequest, (err, result) => {
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
    this.processPool.cancelPendingTask(id)
  }

  async terminate () {
    await this.processPool.close()
  }
}
