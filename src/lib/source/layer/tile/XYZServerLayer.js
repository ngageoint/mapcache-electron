import NetworkTileLayer from './NetworkTileLayer'
import XYZTileUtilities from '../../../XYZTileUtilities'
import ServiceConnectionUtils from '../../../ServiceConnectionUtils'
import CancellableTileRequest from '../../../CancellableTileRequest'
import _ from 'lodash'
import LayerTypes from '../LayerTypes'

export default class XYZServerLayer extends NetworkTileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.subdomains = configuration.subdomains
  }

  async initialize () {
    this.axiosInstance = ServiceConnectionUtils.getThrottledAxiosInstance(this.rateLimit)
    await super.initialize()
    const options = {
      subdomains: this.subdomains || [],
      timeout: this.timeoutMs,
      allowAuth: true
    }
    let {error} = await ServiceConnectionUtils.testServiceConnection(this.filePath, ServiceConnectionUtils.SERVICE_TYPE.XYZ, options)
    if (error) {
      this.setError(error)
    }
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: LayerTypes.XYZ_SERVER,
        subdomains: this.subdomains
      }
    }
  }

  get extent () {
    if (this._configuration.extent) {
      return this._configuration.extent
    }
    this._configuration.extent = [-180, -90, 180, 90]
    return this._configuration.extent
  }

  async renderTile (coords, tileCanvas, done) {
    if (this.hasError()) {
      done(this.error, null)
    } else {
      const cancellableTileRequest = new CancellableTileRequest()
      const url = XYZTileUtilities.generateUrlForTile(this.filePath, this.subdomains || [], coords.x, coords.y, coords.z)
      cancellableTileRequest.requestTile(this.axiosInstance, url, this.retryAttempts, this.timeoutMs).then(({dataUrl, error}) => {
        if (!_.isNil(error)) {
          this.setError(error)
        }
        done(error, dataUrl)
      })
    }
  }
}
