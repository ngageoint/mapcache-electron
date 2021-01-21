import WMSMapLayer from './WMSMapLayer'
import XYZServerMapLayer from './XYZServerMapLayer'
import DefaultMapLayer from './DefaultMapLayer'

export default class LeafletMapLayerFactory {
  static constructMapLayer (layerModel) {
    switch (layerModel.layerType) {
      case 'WMS':
        return WMSMapLayer.constructMapLayer(layerModel)
      case 'XYZServer':
        return XYZServerMapLayer.constructMapLayer(layerModel)
      default:
        return DefaultMapLayer.constructMapLayer(layerModel)
    }
  }
}
