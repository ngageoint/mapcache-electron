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
      await this.geopackage.xyzTile(this.layer.sourceLayerName, x, y, z, 256, 256, canvas)
      callback(null, canvas.toDataURL('image/png'))
    } else {
      callback('GeoPackage connection is null', null)
    }
  }
}
