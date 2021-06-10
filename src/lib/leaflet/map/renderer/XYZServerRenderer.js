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

  async renderTile (coords, callback) {
    if (!isNil(this.error)) {
      callback(this.error, null)
    } else {
      const cancellableTileRequest = new CancellableTileRequest(this.isElectron)
      cancellableTileRequest.requestTile(this.axiosRequestScheduler, this.layer.getTileUrl(coords), this.retryAttempts, this.timeoutMs).then(({dataUrl, error}) => {
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
