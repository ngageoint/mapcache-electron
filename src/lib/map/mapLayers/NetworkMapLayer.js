import * as Vendor from '../../vendor'
import _ from 'lodash'

/**
 * NetworkMapLayer is a leaflet map layer that allows for some general networking safety precautions, established by the map layer
 */
export default class NetworkMapLayer {
  static constructMapLayer (layer, mapPane = 'overlayPane', isPreview = false) {
    let southWest = Vendor.L.latLng(layer.extent[1], layer.extent[0])
    let northEast = Vendor.L.latLng(layer.extent[3], layer.extent[2])
    let bounds = Vendor.L.latLngBounds(southWest, northEast)
    const options = {
      layer: layer,
      bounds: bounds,
      transparent: true,
      format: layer.format || 'image/png',
      zIndex: 401,
      pane: mapPane,
      isPreview: isPreview,
      opacity: !_.isNil(layer.opacity) ? layer.opacity : 1.0,
      maxZoom: 20
    }
    if (!_.isNil(layer.layers)) {
      options.layers = layer.layers.join()

    }

    return new Vendor.L.TileLayer.MapCacheNetworkingLayer(options)
  }
}
