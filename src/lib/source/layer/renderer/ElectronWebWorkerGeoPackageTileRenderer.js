import { spawn, Thread, Worker } from 'threads'
import LayerTypes from '../LayerTypes'
import GeoPackageTileRenderer from './GeoPackageTileRenderer'
// import FileUtilities from '../../../util/FileUtilities'

/**
 * GeoTIFF Renderer
 */
export default class ElectronWebWorkerGeoPackageTileRenderer extends GeoPackageTileRenderer {
  webWorker

  constructor(layer) {
    super(layer)
  }

  async initialize() {
    if (this.webWorker == null) {
      this.webWorker = await spawn(new Worker('./../../../webworkers/tileWebWorker.js'))
      // const filedata = FileUtilities.readFile(this.layer.filePath)
      this.webWorker.open('file://' + this.layer.filePath).then(result => {
        if (result != null && result.error != null) {
          console.error(result.error)
        }
      })
    }
  }

  close () {
    if (this.webWorker != null) {
      this.webWorker.close()
      Thread.terminate(this.webWorker)
    }
  }

  /**
   * Cancels a geotiff tile request
   */
  cancel () {
    // const coordsString = coords.x + '_' + coords.y + '_' + coords.z
    // if (this.tileRequests[coordsString]) {
    //   const requestId = this.tileRequests[coordsString].id
    //   // ipcRenderer.send('cancel_tile_request', {id: requestId})
    //   // ipcRenderer.removeAllListeners('request_tile_' + requestId)
    //   delete this.tileRequests[coordsString]
    // }
  }

  /**
   * Will make a request to a worker thread that will generate the tile data to keep the UI thread running smoooth.
   * @param coords
   * @param callback
   * @returns {Promise<void>}
   * @override
   */
  async renderTile (coords, callback) {
    // const coordsString = coords.x + '_' + coords.y + '_' + coords.z
    const tileRequest = {
      // id: UniqueIDUtilities.createUniqueID(),
      coords,
      tableName: this.layer.sourceLayerName,
      dbFile: this.layer.filePath,
      layerType: LayerTypes.GEOPACKAGE
    }

    // this.tileRequests[coordsString] = tileRequest

    this.webWorker.renderTile(tileRequest).then(result => {
      callback(null, result)
    }).catch(e => {
      callback(e, null)
    })
  }
}
