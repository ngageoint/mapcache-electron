import isNil from 'lodash/isNil'
import CanvasUtilities from '../../../util/CanvasUtilities'

/**
 * Renderer class for GeoPackage Tile Layer
 */
export default class GeoPackageTileRenderer {
  layer
  geopackage

  constructor (layer) {
    this.layer = layer
  }

  setGeoPackage (geopackage) {
    this.geopackage = geopackage
  }

  async renderTile (coords, callback) {
    let {x, y, z} = coords
    if (!isNil(this.geopackage)) {
      const canvas = CanvasUtilities.createCanvas(256, 256)
      await this.geopackage.xyzTileScaled(this.layer.sourceLayerName, x, y, z, 256, 256, canvas, 2, 2)
      const dataUrl = canvas.toDataURL();
      if (canvas.dispose) {
        canvas.dispose();
      }
      callback(null, dataUrl)
    } else {
      callback('GeoPackage connection is null', null)
    }
  }
}
