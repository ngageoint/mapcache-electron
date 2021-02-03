import GeoTiffLayer from './tile/GeoTiffLayer'
import GeoPackageLayer from './tile/GeoPackageLayer'
import XYZServerLayer from './tile/XYZServerLayer'
import MBTilesLayer from './tile/MBTilesLayer'
import WMSLayer from './tile/WMSLayer'
import VectorLayer from './vector/VectorLayer'
import XYZFileLayer from './tile/XYZFileLayer'

export default class LayerFactory {
  static constructLayer (configuration) {
    switch (configuration.layerType) {
      case GeoTiffLayer.LAYER_TYPE:
        return new GeoTiffLayer(configuration)
      case MBTilesLayer.LAYER_TYPE:
        return new MBTilesLayer(configuration)
      case XYZServerLayer.LAYER_TYPE:
        return new XYZServerLayer(configuration)
      case XYZFileLayer.LAYER_TYPE:
        return new XYZFileLayer(configuration)
      case WMSLayer.LAYER_TYPE:
        return new WMSLayer(configuration)
      case GeoPackageLayer.LAYER_TYPE:
        return new GeoPackageLayer(configuration)
      case VectorLayer.LAYER_TYPE:
        return new VectorLayer(configuration)
    }
  }
}
