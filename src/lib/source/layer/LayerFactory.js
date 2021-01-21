import GeoTiffLayer from './tile/GeoTiffLayer'
import GeoPackageLayer from './tile/GeoPackageLayer'
import XYZServerLayer from './tile/XYZServerLayer'
import MBTilesLayer from './tile/MBTilesLayer'
import WMSLayer from './tile/WMSLayer'
import DrawingLayer from './vector/DrawingLayer'
import VectorLayer from './vector/VectorLayer'

export default class LayerFactory {
  static constructLayer (configuration) {
    switch (configuration.layerType) {
      case 'GeoTIFF':
        return new GeoTiffLayer(configuration)
      case 'MBTiles':
        return new MBTilesLayer(configuration)
      case 'XYZServer':
        return new XYZServerLayer(configuration)
      case 'WMS':
        return new WMSLayer(configuration)
      case 'GeoPackage':
        return new GeoPackageLayer(configuration)
      case 'Drawing':
        return new DrawingLayer(configuration)
      case 'Vector':
        return new VectorLayer(configuration)
    }
  }
}
