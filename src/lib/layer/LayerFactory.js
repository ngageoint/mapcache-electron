import GeoTiffLayer from './tile/GeoTiffLayer'
import GeoPackageTileLayer from './tile/GeoPackageTileLayer'
import XYZServerLayer from './tile/XYZServerLayer'
import MBTilesLayer from './tile/MBTilesLayer'
import WMSLayer from './tile/WMSLayer'
import VectorLayer from './vector/VectorLayer'
import XYZFileLayer from './tile/XYZFileLayer'
import { GEOTIFF, MBTILES, XYZ_FILE, XYZ_SERVER, WMS, GEOPACKAGE, VECTOR } from './LayerTypes'

/**
 * Simple factory for constructing a layer based on it's type
 */
function constructLayer (configuration) {
  switch (configuration.layerType) {
    case GEOTIFF:
      return new GeoTiffLayer(configuration)
    case MBTILES:
      return new MBTilesLayer(configuration)
    case XYZ_SERVER:
      return new XYZServerLayer(configuration)
    case XYZ_FILE:
      return new XYZFileLayer(configuration)
    case WMS:
      return new WMSLayer(configuration)
    case GEOPACKAGE:
      return new GeoPackageTileLayer(configuration)
    case VECTOR:
      return new VectorLayer(configuration)
  }
}

export {
  constructLayer
}
