import GeoTiffLayer from './GeoTiffLayer'
import GeoPackageLayer from './GeoPackageLayer'
import GDALVectorLayer from './GDALVectorLayer'
import XYZServerLayer from './XYZServerLayer'
import WMSLayer from './WMSLayer'
import WFSLayer from './WFSLayer'

export default class LayerFactory {
  static constructLayer (configuration) {
    switch (configuration.layerType) {
      case 'GeoTIFF':
        return new GeoTiffLayer(configuration)
      case 'GeoPackage':
        return new GeoPackageLayer(configuration)
      case 'GDALVector':
        return new GDALVectorLayer(configuration)
      case 'XYZServer':
        return new XYZServerLayer(configuration)
      case 'WMS':
        return new WMSLayer(configuration)
      case 'WFS':
        return new WFSLayer(configuration)
    }
  }
}
