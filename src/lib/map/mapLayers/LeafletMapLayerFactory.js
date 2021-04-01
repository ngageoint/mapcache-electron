import NetworkMapLayer from './NetworkMapLayer'
import DefaultMapLayer from './DefaultMapLayer'
import LayerTypes from '../../source/layer/LayerTypes'

export default class LeafletMapLayerFactory {
  /**
   * Constructs a map layer from an initialized layer
   * @param layer - initialized layer
   * @param mapPane - the map pane to add the layer to
   * @param isPreview - flag if this is preview mode
   */
  static constructMapLayer (layer, mapPane = 'overlayPane', isPreview = false) {
    switch (layer.layerType) {
      case LayerTypes.WMS:
      case LayerTypes.XYZ_SERVER:
        return NetworkMapLayer.constructMapLayer(layer, mapPane, isPreview)
      default:
        return DefaultMapLayer.constructMapLayer(layer, mapPane)
    }
  }
}
