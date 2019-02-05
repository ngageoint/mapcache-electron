import GeoTiffLayer from './GeoTiffLayer'
import GeoPackageLayer from './GeoPackageLayer'
import GDALVectorLayer from './GDALVectorLayer'

export default class LayerFactory {
  static constructLayer (configuration) {
    switch (configuration.layerType) {
      case 'GeoTIFF':
        return new GeoTiffLayer(configuration)
      case 'GeoPackage':
        return new GeoPackageLayer(configuration)
      case 'GDALVector':
        return new GDALVectorLayer(configuration)
    }
  }
}
