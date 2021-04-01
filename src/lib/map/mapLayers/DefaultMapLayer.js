import * as Vendor from '../../leaflet/vendor'
import isNil from 'lodash/isNil'

/**
 * Deafult Map Layer, which wraps MapCache Layers in a MapCacheMapLayer
 */
export default class DefaultMapLayer {
  static constructMapLayer (layer, mapPane = 'overlayPane') {
    return new Vendor.L.GridLayer.MapCacheMapLayer({
      layer: layer,
      pane: mapPane,
      zIndex: 401,
      opacity: !isNil(layer.opacity) ? layer.opacity : 1.0
    })
  }
}
