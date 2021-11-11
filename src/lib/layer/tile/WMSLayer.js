import {
  getTileRequestURL,
  getBoundingBoxForWMSRequest
} from '../../util/geoserver/GeoServiceUtilities'
import NetworkTileLayer from './NetworkTileLayer'
import { WMS } from '../LayerTypes'

export default class WMSLayer extends NetworkTileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.layers = configuration.layers
    this.format = configuration.format || 'image/png'
    this.version = configuration.version
    this.requiresReprojection = !configuration.srs.endsWith(':3857')
    this.srs = configuration.srs
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: WMS,
        version: this.version,
        layers: this.layers,
        formats: this.formats
      }
    }
  }

  update (configuration) {
    super.update(configuration)
  }

  /**
   * Gets tile request data
   * @param webMercatorBoundingBox
   * @param coords
   * @param size
   * @param projectedBoundingBox
   * @return {{webMercatorBoundingBox: *, srs, bbox, webRequests: [{url: string}]}}
   */
  getTileRequestData (webMercatorBoundingBox, coords, size, projectedBoundingBox) {
    const bbox = getBoundingBoxForWMSRequest(projectedBoundingBox, this.version, this.srs)

    return {
      bbox: projectedBoundingBox,
      srs: this.srs,
      webRequests: [{
        url: getTileRequestURL(this.filePath, this.layers, size.x, size.y, bbox, this.srs, this.version, this.format),
        width: size.x,
        height: size.y,
        tileBounds: [projectedBoundingBox.minLon, projectedBoundingBox.minLat, projectedBoundingBox.maxLon, projectedBoundingBox.maxLat]
      }]
    }
  }
}
