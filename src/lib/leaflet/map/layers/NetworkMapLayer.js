import { L } from '../../vendor'
import isNil from 'lodash/isNil'

/**
 * NetworkMapLayer is a leaflet map layer that allows for some general networking safety precautions, established by the map layer
 */
export default class NetworkMapLayer {
  static constructMapLayer (layer, mapPane = 'overlayPane', className, crs) {
    let southWest = L.latLng(layer.extent[1], layer.extent[0])
    let northEast = L.latLng(layer.extent[3], layer.extent[2])
    let bounds = L.latLngBounds(southWest, northEast)
    const options = {
      layer: layer,
      bounds: bounds,
      transparent: true,
      format: layer.format || 'image/png',
      zIndex: 401,
      pane: mapPane,
      opacity: !isNil(layer.opacity) ? layer.opacity : 1.0,
      minZoom: layer.minZoom || 0,
      maxZoom: layer.maxZoom || 20,
      className: className,
      crs: crs
    }
    if (!isNil(layer.layers)) {
      options.layers = layer.layers.join()

    }

    return new L.TileLayer.MapCacheRemoteLayer(options)
  }
}
