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
    this.axiosRequestScheduler = ServiceConnectionUtils.getAxiosRequestScheduler(this.rateLimit)
    await super.initialize()
    return this
  }

  async testConnection (allowAuth = false) {
    const options = {
      subdomains: this.subdomains || [],
      timeout: this.timeoutMs,
      allowAuth: allowAuth
    }
    let {error} = await ServiceConnectionUtils.testServiceConnection(this.filePath, ServiceConnectionUtils.SERVICE_TYPE.XYZ, options)
    if (!_.isNil(error) && !ServiceConnectionUtils.isTimeoutError(error)) {
      throw error
    }
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

  update (configuration) {
    super.update(configuration)
  }

  get extent () {
    if (this._configuration.extent) {
      return this._configuration.extent
    }
    this._configuration.extent = [-180, -90, 180, 90]
    return this._configuration.extent
  }

  /**
   * Gets the tile url for this service
   * @param coords
   */
  getTileUrl (coords) {
    return XYZTileUtilities.generateUrlForTile(this.filePath, this.subdomains || [], coords.x, coords.y, coords.z)
  }

  async renderTile (coords, tileCanvas, done) {
    if (this.hasError()) {
      done(this.error, null)
    } else {
      const cancellableTileRequest = new CancellableTileRequest()
      cancellableTileRequest.requestTile(this.axiosRequestScheduler, this.getTileUrl(coords), this.retryAttempts, this.timeoutMs).then(({dataUrl, error}) => {
        if (!_.isNil(error)) {
          this.setError(error)
        }
        done(error, dataUrl)
      })
    }
  }
}
