import { L } from '../../vendor'
import isNil from 'lodash/isNil'
import { isRemote, MBTILES, GEOTIFF } from '../../../layer/LayerTypes'

/**
 * Deafult Map Layer, which wraps MapCache Layers in a MapCacheMapLayer
 */
export default class DefaultMapLayer {
  static constructMapLayer (layer, mapPane = 'overlayPane', maxFeatures, className = '', zIndex = 401) {
    const options = {
      layer: layer,
      pane: mapPane,
      zIndex: zIndex,
      maxFeatures: maxFeatures,
      className: className
    }

    if (isRemote(layer)) {
      if (layer.minZoom != null) {
        options.minZoom = layer.minZoom
      }
      if (layer.maxZoom != null) {
        options.maxZoom = layer.maxZoom
      }
    }

    if (layer.layerType === MBTILES || layer.layerType === GEOTIFF) {
      if (layer.extent != null) {
        try {
          let southWest = L.latLng(layer.extent[1], layer.extent[0])
          let northEast = L.latLng(layer.extent[3], layer.extent[2])
          options.bounds = L.latLngBounds(southWest, northEast)
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
    }

    if (!isNil(layer.opacity)) {
      options.opacity = layer.opacity
    }

    return new L.GridLayer.MapCacheLayer(options)
  }
}
