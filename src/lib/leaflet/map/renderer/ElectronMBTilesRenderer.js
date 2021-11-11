import { MBTILES } from '../../../layer/LayerTypes'
import ElectronTileRenderer from './ElectronTileRenderer'

/**
 * MBTiles Renderer
 */
export default class ElectronMBTilesRenderer extends ElectronTileRenderer {
  setStyle (pointStyle, lineStyle, polygonStyle) {
    this.pointStyle = pointStyle
    this.lineStyle = lineStyle
    this.polygonStyle = polygonStyle
  }

  getTileRequest (requestId, coords, size) {
    const request = super.getTileRequest(requestId, coords, size)
    return Object.assign(request, {
      dbFile: this.layer.filePath,
      format: this.layer.format,
      pointStyle: this.layer.pointStyle,
      lineStyle: this.layer.lineStyle,
      polygonStyle: this.layer.polygonStyle,
      layerType: MBTILES
    })
  }
}
