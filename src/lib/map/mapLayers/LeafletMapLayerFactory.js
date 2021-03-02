import WMSMapLayer from './WMSMapLayer'
import XYZServerMapLayer from './XYZServerMapLayer'
import DefaultMapLayer from './DefaultMapLayer'
import LayerTypes from '../../source/layer/LayerTypes'

export default class LeafletMapLayerFactory {
  static constructMapLayer (layerModel, mapPane = 'overlayPane', isPreview = false) {
    switch (layerModel.layerType) {
      case LayerTypes.WMS:
        return WMSMapLayer.constructMapLayer(layerModel, mapPane, isPreview)
      case LayerTypes.XYZ_SERVER:
        return XYZServerMapLayer.constructMapLayer(layerModel, mapPane, isPreview)
      default:
        return DefaultMapLayer.constructMapLayer(layerModel, mapPane)
    }
  }
}
