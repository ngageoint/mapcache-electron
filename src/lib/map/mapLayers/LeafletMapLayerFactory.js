import DrawingMapLayer from './DrawingMapLayer'
import WMSMapLayer from './WMSMapLayer'
import XYZServerMapLayer from './XYZServerMapLayer'
import DefaultMapLayer from './DefaultMapLayer'

export default class LayerFactory {
  static constructMapLayer (layerModel) {
    console.log(layerModel.layerType)
    switch (layerModel.layerType) {
      case 'Drawing':
        return DrawingMapLayer.constructMapLayer(layerModel)
      case 'WMS':
        return WMSMapLayer.constructMapLayer(layerModel)
      case 'XYZServer':
        return XYZServerMapLayer.constructMapLayer(layerModel)
      default:
        return DefaultMapLayer.constructMapLayer(layerModel)
    }
  }
}
