import WMSMapLayer from './WMSMapLayer'
import XYZServerMapLayer from './XYZServerMapLayer'
import DefaultMapLayer from './DefaultMapLayer'
import WMSLayer from '../../source/layer/tile/WMSLayer'
import XYZServerLayer from '../../source/layer/tile/XYZServerLayer'

export default class LeafletMapLayerFactory {
  static constructMapLayer (layerModel, mapPane = 'overlayPane') {
    switch (layerModel.layerType) {
      case WMSLayer.LAYER_TYPE:
        return WMSMapLayer.constructMapLayer(layerModel, mapPane)
      case XYZServerLayer.LAYER_TYPE:
        return XYZServerMapLayer.constructMapLayer(layerModel, mapPane)
      default:
        return DefaultMapLayer.constructMapLayer(layerModel, mapPane)
    }
  }
}
