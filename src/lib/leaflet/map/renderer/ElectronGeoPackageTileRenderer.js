import { GEOPACKAGE } from '../../../layer/LayerTypes'
import ElectronTileRenderer from './ElectronTileRenderer'

/**
 * GeoTIFF Renderer
 */
export default class ElectronGeoPackageTileRenderer extends ElectronTileRenderer {
  getTileRequest (requestId, coords, size, crs) {
    const request = super.getTileRequest(requestId, coords, size, crs)
    return Object.assign(request, {
      tableName: this.layer.sourceLayerName,
      dbFile: this.layer.filePath,
      layerType: GEOPACKAGE
    })
  }
}
