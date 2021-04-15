import path from 'path'
import WorkerThreadPool from '../pool/workerThreadPool'
import os from 'os'
import isNil from 'lodash/isNil'
import FileUtilities from '../../util/FileUtilities'

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
    return new Promise((resolve) => {
      this.threadPool.addTask({id: data.id, type: 'attach_media', data: data}, (err, result) => {
        if (err) {
          result = { error: err }
        }
        resolve(result)
      })
    })
  }

  processDataSource (data) {
    return new Promise((resolve) => {
      // set up initial directory
      const directory = data.source.directory
      this.threadPool.addTask({id: data.id, type: 'process_source', data: data}, (err, result) => {
        if (!isNil(err)) {
          if (isNil(result)) {
            result = {}
          }
          result.error = err
          FileUtilities.rmDir(directory)
        }
        resolve(result)
      }, () => {
        FileUtilities.rmDir(directory)
      })
    })
  }

  renderGeoPackageTile (data) {
    return new Promise((resolve) => {
      this.threadPool.addTask({id: data.id, type: 'render_tile', data: data}, (err, result) => {
        if (err) {
          result = { error: err }
        }
        resolve(result)
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
