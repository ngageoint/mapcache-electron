import {
  getTileRequestURL,
  getBoundingBoxForWMSRequest
} from '../../util/GeoServiceUtilities'
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
   * @param coords
   * @return {{webMercatorBoundingBox: *, srs, bbox, url: string}}
   */
  getTileRequestData (coords) {
    let {x, y, z} = coords
    let requestBoundingBox
    const webMercatorBoundingBox = window.mapcache.getWebMercatorBoundingBoxFromXYZ(x, y, z)

    if (this.requiresReprojection) {
      requestBoundingBox = window.mapcache.reprojectWebMercatorBoundingBox(webMercatorBoundingBox.minLon, webMercatorBoundingBox.maxLon, webMercatorBoundingBox.minLat, webMercatorBoundingBox.maxLat, this.srs)
    } else {
      requestBoundingBox = webMercatorBoundingBox
    }
    const bbox = getBoundingBoxForWMSRequest(requestBoundingBox, this.version, this.srs)

    return {
      url: getTileRequestURL(this.filePath, this.layers, 256, 256, bbox, this.srs, this.version, this.format),
      bbox: requestBoundingBox,
      srs: this.srs,
      webMercatorBoundingBox: webMercatorBoundingBox
    }
  }
}
