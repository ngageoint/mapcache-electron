import {
  getTileRequestURL,
  getBoundingBoxForWMSRequest
} from '../../util/geoserver/GeoServiceUtilities'
import NetworkTileLayer from './NetworkTileLayer'
import { WMS } from '../LayerTypes'
import cloneDeep from 'lodash/cloneDeep'
import { WEB_MERCATOR } from '../../projection/ProjectionConstants'

export default class WMSLayer extends NetworkTileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.layers = configuration.layers
    this.format = configuration.format || 'image/png'
    this.version = configuration.version
    this.srs = configuration.srs || WEB_MERCATOR
    this.extent = WMSLayer.getExtentForLayers(configuration.layers)
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

  static getExtentForLayers (layers) {
    let layersToReview = layers.filter(layer => layer.enabled)
    if (layersToReview.length === 0) {
      layersToReview = layers
    }

    if (layersToReview.length === 0) {
      return [-180, -90, 180, 90]
    } else {
      const extent = cloneDeep(layersToReview[0].extent)

      layersToReview.slice(1).forEach(layer => {
        if (layer.extent[0] < extent[0]) {
          extent[0] = layer.extent[0]
        }
        if (layer.extent[1] < extent[1]) {
          extent[1] = layer.extent[1]
        }
        if (layer.extent[2] > extent[2]) {
          extent[2] = layer.extent[2]
        }
        if (layer.extent[3] > extent[3]) {
          extent[3] = layer.extent[3]
        }
      })
      return extent
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
