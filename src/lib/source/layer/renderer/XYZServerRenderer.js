import isNil from 'lodash/isNil'
import ServiceConnectionUtils from '../../../network/ServiceConnectionUtils'
import CancellableTileRequest from '../../../network/CancellableTileRequest'
import NetworkTileRenderer from './NetworkTileRenderer'

export default class XYZServerRenderer extends NetworkTileRenderer {
  constructor (configuration = {}) {
    super(configuration)
    this.axiosRequestScheduler = ServiceConnectionUtils.getAxiosRequestScheduler(this.rateLimit)
  }

  async renderTile (coords, callback) {
    if (!isNil(this.error)) {
      callback(this.error, null)
    } else {
      const cancellableTileRequest = new CancellableTileRequest()
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
