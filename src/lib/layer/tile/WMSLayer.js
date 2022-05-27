import {
  getTileRequestURL,
  getBoundingBoxForWMSRequest
} from '../../util/geoserver/GeoServiceUtilities'
import { WMS } from '../LayerTypes'
import { WEB_MERCATOR } from '../../projection/ProjectionConstants'
import MultiLayerNetworkTileLayer from './MultiLayerNetworkTileLayer'

export default class WMSLayer extends MultiLayerNetworkTileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.layers = configuration.layers
    this.format = configuration.format || 'image/png'
    this.version = configuration.version
    this.srs = configuration.srs || WEB_MERCATOR
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: WMS,
        version: this.version,
        layers: this.layers,
        formats: this.formats,
        srs: this.srs
      }
    }
  }

  update (configuration) {
    super.update(configuration)
    if (configuration.layers != null) {
      this.layers = configuration.layers
      this.extent = WMSLayer.getExtentForLayers(configuration.layers)
    }
  }

  /**
   * Gets tile request data
   * @param webMercatorBoundingBox
   * @param coords
   * @param size
   * @param projectedBoundingBoxFunction
   * @returns {*[]}
   */
  getTileRequestData (webMercatorBoundingBox, coords, size, projectedBoundingBoxFunction) {
    const projectedBoundingBox = projectedBoundingBoxFunction(webMercatorBoundingBox, this.srs)
    const bbox = getBoundingBoxForWMSRequest(projectedBoundingBox, this.version, this.srs)
    const layers = this.layers.filter(l => l.enabled).map(l => l.name).reverse()
    const requests = []
    if (layers.length > 0) {
      requests.push({
        url: getTileRequestURL(this.filePath, layers, size.x, size.y, bbox, this.srs, this.version, this.format),
        width: size.x,
        height: size.y,
        tileBounds: [projectedBoundingBox.minLon, projectedBoundingBox.minLat, projectedBoundingBox.maxLon, projectedBoundingBox.maxLat],
        imageBounds: [projectedBoundingBox.minLon, projectedBoundingBox.minLat, projectedBoundingBox.maxLon, projectedBoundingBox.maxLat],
        tileSRS: this.srs
      })
    }
    return requests
  }
}
