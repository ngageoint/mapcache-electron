import isNil from 'lodash/isNil'
import { getAxiosRequestScheduler } from '../../../network/ServiceConnectionUtils'
import CancellableTileRequest from '../../../network/CancellableTileRequest'
import NetworkTileRenderer from './NetworkTileRenderer'

export default class XYZServerRenderer extends NetworkTileRenderer {
  isElectron
  getWebMercatorBoundingBoxFromXYZ

  constructor (layer = {}, isElectron = false) {
    super(layer)
    this.axiosRequestScheduler = getAxiosRequestScheduler(this.rateLimit)
    this.isElectron = isElectron
    if (this.isElectron) {
      const { getWebMercatorBoundingBoxFromXYZ } = require('../../../util/tile/TileBoundingBoxUtils')
      this.getWebMercatorBoundingBoxFromXYZ = getWebMercatorBoundingBoxFromXYZ
    } else {
      this.getWebMercatorBoundingBoxFromXYZ = window.mapcache.getWebMercatorBoundingBoxFromXYZ
    }
  }

  async renderTile (requestId, coords, size, callback) {
    if (coords.z < this.layer.minZoom || coords.z > this.layer.maxZoom) {
      callback (null, null)
    } else if (!isNil(this.error)) {
      callback(this.error, null)
    } else {
      const cancellableTileRequest = new CancellableTileRequest(this.isElectron)
      cancellableTileRequest.requestTile(this.axiosRequestScheduler, this.layer.getTileUrl(coords), this.retryAttempts, this.timeoutMs, this.layer.withCredentials, size).then(({dataUrl, error}) => {
        if (!isNil(error)) {
          this.setError(error)
        }
        if (isNil(dataUrl) || dataUrl.indexOf('data:image') === -1) {
          dataUrl = null
          error = null
        }
        callback(error, dataUrl)
      })
    }
  }
}
