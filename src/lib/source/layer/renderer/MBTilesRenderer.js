import MBTilesRenderingUtilities from '../../../util/MBTilesRenderingUtilities'

export default class MBTilesRenderer {
  db
  pointStyle
  lineStyle
  polygonStyle

  constructor (layer) {
    this.layer = layer
  }

  setStyle (pointStyle, lineStyle, polygonStyle) {
    this.pointStyle = pointStyle
    this.lineStyle = lineStyle
    this.polygonStyle = polygonStyle
  }

  setDb (db) {
    this.db = db
  }

  /**
   * Renders a tile
   * @param coords
   * @param callback
   * @returns {Promise<void>}
   */
  async renderTile (coords, callback) {
    let tileRequest = {
      coords,
      dbFile: this.layer.filePath,
      format: this.layer.format,
      pointStyle: this.pointStyle,
      lineStyle: this.lineStyle,
      polygonStyle: this.polygonStyle
    }

    try {
      const result = await MBTilesRenderingUtilities.requestTile(tileRequest)
      callback(null, result)
    } catch (e) {
      callback(e, null)
    }
  }
}
