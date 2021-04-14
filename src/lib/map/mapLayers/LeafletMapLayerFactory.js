import NetworkMapLayer from './NetworkMapLayer'
import DefaultMapLayer from './DefaultMapLayer'
import LayerTypes from '../../source/layer/LayerTypes'

export default class LeafletMapLayerFactory {
  /**
   * Constructs a map layer from an initialized layer
   * @param options {layer: {}, mapPane: String, isPreview: Boolean, maxFeatures: Number}
   */
  static constructMapLayer (options) {
    const layer = options.layer
    const mapPane = options.mapPane || 'overlayPane'
    const isPreview = options.isPreview || false
    const maxFeatures = options.maxFeatures
    switch (layer.layerType) {
      case LayerTypes.WMS:
      case LayerTypes.XYZ_SERVER:
        return NetworkMapLayer.constructMapLayer(layer, mapPane, isPreview)
      default:
        return DefaultMapLayer.constructMapLayer(layer, mapPane, maxFeatures)
    }
  }
}
