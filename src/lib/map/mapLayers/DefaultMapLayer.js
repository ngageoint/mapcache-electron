import { L } from '../../leaflet/vendor'
import isNil from 'lodash/isNil'

/**
 * Deafult Map Layer, which wraps MapCache Layers in a MapCacheMapLayer
 */
export default class DefaultMapLayer {
  static constructMapLayer (layer, mapPane = 'overlayPane', maxFeatures) {
    const options = {
      layer: layer,
      pane: mapPane,
      zIndex: 401,
      maxFeatures: maxFeatures
    }

    try {
      // let southWest = L.latLng(layer.extent[1], layer.extent[0])
      // let northEast = L.latLng(layer.extent[3], layer.extent[2])
      // options.bounds = L.latLngBounds(southWest, northEast)
      // eslint-disable-next-line no-empty
    } catch (e) {}

    // if (!isNil(layer.minZoom)) {
    //   options.minZoom = layer.minZoom
    // }
    //
    // if (!isNil(layer.maxZoom)) {
    //   options.maxZoom = layer.maxZoom
    // }

    if (!isNil(layer.opacity)) {
      options.opacity = layer.opacity
    }

    return new L.GridLayer.MapCacheLayer(options)
  }
}
