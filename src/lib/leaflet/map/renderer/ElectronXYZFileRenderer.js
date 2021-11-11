import { XYZ_FILE } from '../../../layer/LayerTypes'
import ElectronTileRenderer from './ElectronTileRenderer'

/**
 * MBTiles Renderer
 */
export default class ElectronXYZFileRenderer extends ElectronTileRenderer {
  getTileRequest (requestId, coords, size) {
    const request = super.getTileRequest(requestId, coords, size)
    return Object.assign(request, {
      filePath: this.layer.filePath,
      layerType: XYZ_FILE
    })
  }

  async renderTile (requestId, coords, size, callback) {
    if (this.layer.minZoom != null && this.layer.maxZoom != null && (this.layer.minZoom > coords.z || this.layer.maxZoom < coords.z)) {
      return callback(null, null)
    } else {
      return super.renderTile(requestId, coords, size, callback)
    }
  }
}
