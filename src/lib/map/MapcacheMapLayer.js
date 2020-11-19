import * as vendor from '../vendor'

export default class MapcacheMapLayer extends vendor.L.GridLayer {
  createTile (coords, done) {
    // create a <canvas> element for drawing
    let tile = vendor.L.DomUtil.create('canvas', 'leaflet-tile')
    // setup tile width and height according to the options
    let size = this.getTileSize()
    tile.width = size.x
    tile.height = size.y
    try {
      this.options.layer.renderTile(coords, tile, done)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('error', e)
    }
    return tile
  }

  close () {
    this.layer.close()
  }
}
