import proj4 from 'proj4'
import GeoServiceUtilities from '../../../GeoServiceUtilities'
import NetworkTileLayer from './NetworkTileLayer'
import TileBoundingBoxUtils from '../../../tile/tileBoundingBoxUtils'
import ServiceConnectionUtils from '../../../ServiceConnectionUtils'
import CancellableTileRequest from '../../../CancellableTileRequest'
import _ from 'lodash'
import LayerTypes from '../LayerTypes'

export default class WMSLayer extends NetworkTileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.layers = configuration.layers
    this.format = configuration.format || 'image/png'
    this.version = configuration.version
  }

  async initialize () {
    this.axiosRequestScheduler = ServiceConnectionUtils.getAxiosRequestScheduler(this.rateLimit)
    await super.initialize()
    return this
  }

  async testConnection (allowAuth = false, ignoreTimeoutError = true) {
    const options = {
      timeout: this.timeoutMs,
      allowAuth: allowAuth
    }
    let {serviceInfo, error} = await ServiceConnectionUtils.testServiceConnection(this.filePath, ServiceConnectionUtils.SERVICE_TYPE.WMS, options)
    if (!_.isNil(serviceInfo)) {
      // verify that this source is still valid when compared to the service info
      const layers = this.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) !== -1)
      if (layers.length !== this.layers.length) {
        const missingLayers = this.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) === -1)
        error = {status: 400, statusText: 'The following layer' + (missingLayers.length > 1 ? 's' : '') + ' no longer exist: ' + missingLayers.join(', ')}
      }
    }
    if (!_.isNil(error) && (!ServiceConnectionUtils.isTimeoutError(error) || !ignoreTimeoutError)) {
      throw error
    }
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: LayerTypes.WMS,
        version: this.version,
        layers: this.layers,
        formats: this.formats
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
   * Function for getting the tile request url for this service
   * @param coords
   */
  getTileUrl (coords) {
    let {x, y, z} = coords
    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
    let referenceSystemName = 'srs'
    let bbox = tileBbox.minLon + ',' + tileBbox.minLat + ',' + tileBbox.maxLon + ',' + tileBbox.maxLat
    if (this.version === '1.3.0') {
      referenceSystemName = 'crs'
    }
    return GeoServiceUtilities.getTileRequestURL(this.filePath, this.layers, 256, 256, bbox, referenceSystemName, this.version, this.format)
  }

  async renderTile (coords, tile, done) {
    if (this.hasError()) {
      done (this.error, null)
    } else {
      let {x, y, z} = coords

      let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
      // assumes projection from 3857 to 4326
      let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
      let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])
      let fullExtent = this.extent
      if (!TileBoundingBoxUtils.tileIntersects(tileUpperRight, tileLowerLeft, [fullExtent[2], fullExtent[3]], [fullExtent[0], fullExtent[1]])) {
        if (done) {
          return done(null, tile)
        }
        return
      }

      let referenceSystemName = 'srs'
      let bbox = tileBbox.minLon + ',' + tileBbox.minLat + ',' + tileBbox.maxLon + ',' + tileBbox.maxLat
      if (this.version === '1.3.0') {
        referenceSystemName = 'crs'
      }

      const cancellableTileRequest = new CancellableTileRequest()
      const url = GeoServiceUtilities.getTileRequestURL(this.filePath, this.layers, 256, 256, bbox, referenceSystemName, this.version, this.format)
      cancellableTileRequest.requestTile(this.axiosRequestScheduler, url, this.retryAttempts, this.timeoutMs).then(({dataUrl, error}) => {
        if (!_.isNil(error)) {
          this.setError(error)
        }
        done(error, dataUrl)
      })
    }
  }
}
