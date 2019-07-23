import GeoTiffLayer from './tile/GeoTiffLayer'
import GeoPackageVectorLayer from './vector/GeoPackageVectorLayer'
import GeoPackageLayer from './tile/GeoPackageLayer'
import GDALVectorLayer from './vector/GDALVectorLayer'
import XYZServerLayer from './tile/XYZServerLayer'
import WMSLayer from './tile/WMSLayer'
import WFSLayer from './vector/WFSLayer'
import DrawingLayer from './vector/DrawingLayer'

export default class LayerFactory {
  static constructLayer (configuration) {
    switch (configuration.layerType) {
      case 'GeoTIFF':
        return new GeoTiffLayer(configuration)
      case 'GeoPackage':
        return new GeoPackageLayer(configuration)
      case 'GeoPackageVector':
        return new GeoPackageVectorLayer(configuration)
      case 'GDALVector':
        return new GDALVectorLayer(configuration)
      case 'XYZServer':
        return new XYZServerLayer(configuration)
      case 'WMS':
        return new WMSLayer(configuration)
      case 'WFS':
        return new WFSLayer(configuration)
      case 'Drawing':
        return new DrawingLayer(configuration)
    }
  }
}
