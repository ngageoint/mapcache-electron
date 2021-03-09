import NetworkMapLayer from './NetworkMapLayer'
import DefaultMapLayer from './DefaultMapLayer'
import LayerTypes from '../../source/layer/LayerTypes'

export default class LeafletMapLayerFactory {
  static constructMapLayer (layerModel, mapPane = 'overlayPane', isPreview = false) {
    switch (layerModel.layerType) {
      case LayerTypes.WMS:
      case LayerTypes.XYZ_SERVER:
        return NetworkMapLayer.constructMapLayer(layerModel, mapPane, isPreview)
      default:
        return DefaultMapLayer.constructMapLayer(layerModel, mapPane)
    }
  }
}
