import GeoTiffRenderer from './GeoTiffRenderer'
import MBTilesRenderer from './MBTilesRenderer'
import XYZServerRenderer from './XYZServerRenderer'
import WMSRenderer from './WMSRenderer'
import GeoPackageTileRenderer from './GeoPackageTileRenderer'
import GeoPackageVectorTileRenderer from './GeoPackageVectorTileRenderer'
import XYZFileRenderer from './XYZFileRenderer'
import LayerTypes from '../LayerTypes'

/**
 * Simple factory for constructing a layer's renderer based on it's type
 */
export default class RendererFactory {

  /**
   * Constructs a layer's renderer
   * @param layer - must be initialized
   * @returns {GeoPackageVectorTileRenderer|GeoTiffRenderer|GeoPackageTileRenderer|MBTilesRenderer|XYZFileLayer|XYZServerRenderer|WMSRenderer}
   */
  static constructRenderer (layer) {
    switch (layer.layerType) {
      case LayerTypes.GEOTIFF:
        return new GeoTiffRenderer(layer)
      case LayerTypes.MBTILES:
        return new MBTilesRenderer(layer)
      case LayerTypes.XYZ_SERVER:
        return new XYZServerRenderer(layer)
      case LayerTypes.XYZ_FILE:
        return new XYZFileRenderer(layer)
      case LayerTypes.WMS:
        return new WMSRenderer(layer)
      case LayerTypes.GEOPACKAGE:
        return new GeoPackageTileRenderer(layer)
      case LayerTypes.VECTOR:
        return new GeoPackageVectorTileRenderer(layer)
      default:
        throw new Error('Layer Type Renderer not supported: ' + layer.layerType)
    }
  }
}
