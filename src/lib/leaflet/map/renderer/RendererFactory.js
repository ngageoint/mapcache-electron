// file based renderers
import ElectronGeoTiffRenderer from './ElectronGeoTiffRenderer'
import ElectronMBTilesRenderer from './ElectronMBTilesRenderer'
import ElectronXYZFileRenderer from './ElectronXYZFileRenderer'
import ElectronGeoPackageTileRenderer from './ElectronGeoPackageTileRenderer'
import ElectronGeoPackageVectorRenderer from './ElectronGeoPackageVectorRenderer'
// remote url request renderers
import WMSRenderer from './WMSRenderer'
import WMTSRenderer from './WMTSRenderer'
import XYZServerRenderer from './XYZServerRenderer'
import { GEOTIFF, MBTILES, XYZ_FILE, XYZ_SERVER, WMS, GEOPACKAGE, VECTOR, WMTS } from '../../../layer/LayerTypes'

/**
 * Constructs a layer's renderer
 * @param layer
 * @param isElectron - electron
 * @returns any
 */
function constructRenderer (layer, isElectron = false) {
  switch (layer.layerType) {
    case GEOTIFF:
      return new ElectronGeoTiffRenderer(layer, isElectron)
    case MBTILES:
      return new ElectronMBTilesRenderer(layer, isElectron)
    case XYZ_SERVER:
      return new XYZServerRenderer(layer, isElectron)
    case XYZ_FILE:
      return new ElectronXYZFileRenderer(layer, isElectron)
    case WMS:
      return new WMSRenderer(layer, isElectron)
    case WMTS:
      return new WMTSRenderer(layer, isElectron)
    case GEOPACKAGE:
      return new ElectronGeoPackageTileRenderer(layer, isElectron)
    case VECTOR:
      return new ElectronGeoPackageVectorRenderer(layer, isElectron)
    default:
      throw new Error('Layer Type Renderer not supported: ' + layer.layerType)
  }
}

/**
 * Simple factory for constructing a layer's renderer based on it's type
 */
export {
  constructRenderer
}
