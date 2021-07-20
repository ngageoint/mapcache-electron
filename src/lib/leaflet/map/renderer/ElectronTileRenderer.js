import { createUniqueID } from '../../../util/UniqueIDUtilities'

/**
 * Electron Tile Renderer. This passes request for tile off to electron main, which has node worker threads prepared to generate tiles
 */
export default class ElectronTileRenderer {
  performBoundaryCheck = true
  tileRequests = {}
  layer
  requestTile
  cancelTileRequest
  tileIntersects

  constructor(layer, isElectron = false) {
    this.layer = layer
    if (isElectron) {
      const { ipcRenderer } = require('electron')
      const { REQUEST_TILE, CANCEL_TILE_REQUEST, REQUEST_TILE_COMPLETED } = require('../../../electron/ipc/MapCacheIPC')
      this.requestTile = (request) => {
        return new Promise(resolve => {
          ipcRenderer.once(REQUEST_TILE_COMPLETED(request.id), (event, result) => {
            resolve(result)
          })
          ipcRenderer.send(REQUEST_TILE, request)
        })
      }

      this.cancelTileRequest = (id) => {
        ipcRenderer.send(CANCEL_TILE_REQUEST, {id: id})
        ipcRenderer.removeAllListeners(REQUEST_TILE_COMPLETED(id))
      }

      const { getWebMercatorBoundingBoxFromXYZ, tileIntersects } = require('../../../util/TileBoundingBoxUtils')
      const { wgs84ToWebMercator } = require('../../../projection/ProjectionUtilities')
      this.tileIntersects = (x, y, z, extent) => {
        let tileBbox = getWebMercatorBoundingBoxFromXYZ(x, y, z)
        // assumes projection from 3857 to 4326
        let tileUpperRight = wgs84ToWebMercator.inverse([tileBbox.maxLon, tileBbox.maxLat])
        let tileLowerLeft = wgs84ToWebMercator.inverse([tileBbox.minLon, tileBbox.minLat])
        return tileIntersects(tileUpperRight, tileLowerLeft, [extent[2], extent[3]], [extent[0], extent[1]])
      }
    } else {
      this.requestTile = window.mapcache.requestTile
      this.cancelTileRequest = window.mapcache.cancelTileRequest
      this.tileIntersects = window.mapcache.tileIntersectsXYZ
    }
  }

  update (layer) {
    this.layer = layer
  }

  /**
   * Cancels tile request
   * @param coords
   */
  cancel (coords) {
    const coordsString = coords.x + '_' + coords.y + '_' + coords.z
    if (this.tileRequests[coordsString]) {
      const requestId = this.tileRequests[coordsString].id
      this.cancelTileRequest(requestId)
      delete this.tileRequests[coordsString]
    }
  }

  getTileRequest (coords) {
    return {
      id: createUniqueID(),
      coords: coords,
      width: 256,
      height: 256
    }
  }

  /**
   * Will make a request to a worker thread that will generate the tile data to keep the UI thread running smoooth.
   * @param coords
   * @param callback
   * @returns {Promise<void>}
   * @override
   */
  async renderTile (coords, callback) {
    const coordsString = coords.x + '_' + coords.y + '_' + coords.z
    if (this.performBoundaryCheck && this.layer.extent && !this.tileIntersects(coords.x, coords.y, coords.z, this.layer.extent)) {
      callback(null, null)
    } else {
      this.tileRequests[coordsString] = this.getTileRequest(coords)
      this.requestTile(this.tileRequests[coordsString]).then((result) => {
        delete this.tileRequests[coordsString]
        try {
          if (result.error) {
            callback(result.error, null)
          } else {
            callback(null, result.base64Image)
          }
        } catch (e) {
          callback(e, null)
        }
      })
    }
  }
}
