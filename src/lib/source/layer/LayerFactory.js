import GeoTiffLayer from './tile/GeoTiffLayer'
import GeoPackageTileLayer from './tile/GeoPackageTileLayer'
import XYZServerLayer from './tile/XYZServerLayer'
import MBTilesLayer from './tile/MBTilesLayer'
import WMSLayer from './tile/WMSLayer'
import VectorLayer from './vector/VectorLayer'
import XYZFileLayer from './tile/XYZFileLayer'
import LayerTypes from './LayerTypes'

/**
 * Simple factory for constructing a layer based on it's type
 */
export default class LayerFactory {
  static constructLayer (configuration) {
    switch (configuration.layerType) {
      case LayerTypes.GEOTIFF:
        return new GeoTiffLayer(configuration)
      case LayerTypes.MBTILES:
        return new MBTilesLayer(configuration)
      case LayerTypes.XYZ_SERVER:
        return new XYZServerLayer(configuration)
      case LayerTypes.XYZ_FILE:
        return new XYZFileLayer(configuration)
      case LayerTypes.WMS:
        return new WMSLayer(configuration)
      case LayerTypes.GEOPACKAGE:
        return new GeoPackageTileLayer(configuration)
      case LayerTypes.VECTOR:
        return new VectorLayer(configuration)
    }
  }
}
