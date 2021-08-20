import isNil from 'lodash/isNil'
import { getAxiosRequestScheduler } from '../../../network/ServiceConnectionUtils'
import CancellableTileRequest from '../../../network/CancellableTileRequest'
import NetworkTileRenderer from './NetworkTileRenderer'

export default class XYZServerRenderer extends NetworkTileRenderer {
  isElectron
  constructor (layer = {}, isElectron = false) {
    super(layer)
    this.axiosRequestScheduler = getAxiosRequestScheduler(this.rateLimit)
    this.isElectron = isElectron
  }

  async renderTile (requestId, coords, callback) {
    if (coords.z < this.layer.minZoom || coords.z > this.layer.maxZoom) {
      callback (null, null)
    } else if (!isNil(this.error)) {
      callback(this.error, null)
    } else {
      const cancellableTileRequest = new CancellableTileRequest()
      cancellableTileRequest.requestTile(this.axiosRequestScheduler, this.layer.getTileRequestData(coords).url, this.retryAttempts, this.timeoutMs, this.layer.withCredentials).then(({dataUrl, error}) => {
        if (!isNil(error)) {
          this.setError(error)
        }
        if (isNil(dataUrl) || dataUrl.startsWith('data:text/html')) {
          dataUrl = null
          error = null
        }
        callback(error, dataUrl)
      })
    }
  }
}
