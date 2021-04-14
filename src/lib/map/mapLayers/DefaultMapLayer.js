import * as Vendor from '../../leaflet/vendor'
import isNil from 'lodash/isNil'

/**
 * Deafult Map Layer, which wraps MapCache Layers in a MapCacheMapLayer
 */
export default class DefaultMapLayer {
  static constructMapLayer (layer, mapPane = 'overlayPane', maxFeatures) {
    let southWest = Vendor.L.latLng(layer.extent[1], layer.extent[0])
    let northEast = Vendor.L.latLng(layer.extent[3], layer.extent[2])
    let bounds = Vendor.L.latLngBounds(southWest, northEast)
    return new Vendor.L.GridLayer.MapCacheMapLayer({
      layer: layer,
      pane: mapPane,
      zIndex: 401,
      opacity: !isNil(layer.opacity) ? layer.opacity : 1.0,
      bounds: bounds,
      maxFeatures: maxFeatures
    })
  }
}
