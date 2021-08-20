import isNil from 'lodash/isNil'
import {
  getTileRequestURL,
  getBoundingBoxForWMSRequest
} from '../../../util/GeoServiceUtilities'
import { getAxiosRequestScheduler } from '../../../network/ServiceConnectionUtils'
import CancellableTileRequest from '../../../network/CancellableTileRequest'
import NetworkTileRenderer from './NetworkTileRenderer'
import { REQUEST_REPROJECT_TILE, REQUEST_REPROJECT_TILE_COMPLETED } from '../../../electron/ipc/MapCacheIPC'

/**
 * Handles the rendering of a WMS layer, this can only be used in a browser context with the mapcache API exposed.
 */
export default class WMSRenderer extends NetworkTileRenderer {
  requiresReprojection
  createUniqueID
  getWebMercatorBoundingBoxFromXYZ
  tileIntersectsXYZ
  reprojectWebMercatorBoundingBox
  ipcRenderer

  constructor (layer, isElectron) {
    super(layer)
    this.axiosRequestScheduler = getAxiosRequestScheduler(this.layer.rateLimit)
    this.requiresReprojection = !layer.srs.endsWith(':3857')
    this.isElectron = isElectron
    if (isElectron) {
      this.createUniqueID = require('../../../util/UniqueIDUtilities').createUniqueID
      const { getWebMercatorBoundingBoxFromXYZ, tileIntersectsXYZ } = require('../../../util/TileBoundingBoxUtils')
      this.getWebMercatorBoundingBoxFromXYZ = getWebMercatorBoundingBoxFromXYZ
      this.tileIntersectsXYZ = tileIntersectsXYZ
      this.reprojectWebMercatorBoundingBox = require('../../../projection/ProjectionUtilities').reprojectWebMercatorBoundingBox
      this.ipcRenderer = require('electron').ipcRenderer
    } else {
      this.createUniqueID = window.mapcache.createUniqueID
      this.getWebMercatorBoundingBoxFromXYZ = window.mapcache.getWebMercatorBoundingBoxFromXYZ
      this.tileIntersectsXYZ = window.mapcache.tileIntersectsXYZ
      this.reprojectWebMercatorBoundingBox = window.mapcache.reprojectWebMercatorBoundingBox
    }
  }

  async renderTile (requestId, coords, callback) {
    if (!isNil(this.error)) {
      callback(this.error, null)
    } else {
      let {x, y, z} = coords
      const webMercatorBoundingBox = this.getWebMercatorBoundingBoxFromXYZ(x, y, z)
      let tileBbox = webMercatorBoundingBox

      if (!this.tileIntersectsXYZ(x, y, z, this.layer.extent)) {
        callback(null, null)
        return
      }

      let bbox = getBoundingBoxForWMSRequest(tileBbox, this.layer.version, this.layer.srs)
      if (this.requiresReprojection) {
        tileBbox = this.reprojectWebMercatorBoundingBox(tileBbox.minLon, tileBbox.maxLon, tileBbox.minLat, tileBbox.maxLat, this.layer.srs)
        bbox = getBoundingBoxForWMSRequest(tileBbox, this.layer.version, this.layer.srs)
      }
      const url = getTileRequestURL(this.layer.filePath, this.layer.layers, 256, 256, bbox, this.layer.srs, this.layer.version, this.layer.format)

      const cancellableTileRequest = new CancellableTileRequest()
      cancellableTileRequest.requestTile(this.axiosRequestScheduler, url, this.retryAttempts, this.timeoutMs, this.layer.withCredentials).then(({dataUrl, error}) => {
        if (!isNil(error)) {
          this.setError(error)
        }
        if (isNil(dataUrl) || dataUrl.startsWith('data:text/html')) {
          callback(error, null)
        } else if (this.requiresReprojection) {
          const request = {
            id: this.createUniqueID(),
            sourceTile: dataUrl,
            sourceBoundingBox: tileBbox,
            sourceSrs: this.layer.srs,
            targetSrs: 'EPSG:3857',
            targetWidth: 256,
            targetHeight: 256,
            targetBoundingBox: webMercatorBoundingBox
          }
          if (this.isElectron) {
            this.ipcRenderer.once(REQUEST_REPROJECT_TILE_COMPLETED(request.id), (event, result) => {
              callback(error, result.base64Image)
            })
            this.ipcRenderer.send(REQUEST_REPROJECT_TILE, request)
          } else {
            window.mapcache.requestTileReprojection(request).then(result => {
              callback(error, result.base64Image)
            }).catch(error => {
              callback(error, null)
            })
          }
        } else {
          callback(error, dataUrl)
        }
      })
    }
  }
}
