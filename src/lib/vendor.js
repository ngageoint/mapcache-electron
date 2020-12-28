import L from 'leaflet'

// hack so that leaflet's images work after going through webpack
import marker from 'leaflet/dist/images/marker-icon.png'
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import LeafletEditable from 'leaflet-editable' // eslint-disable-line no-unused-vars
import LeafletDraw from 'leaflet-draw' // eslint-disable-line no-unused-vars
import 'leaflet-draw/dist/leaflet.draw.css' // eslint-disable-line no-unused-vars
delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  shadowUrl: markerShadow
})

/*
 * Workaround for 1px lines appearing in some browsers due to fractional transforms
 * and resulting anti-aliasing.
 * https://github.com/Leaflet/Leaflet/issues/3575
 */
const originalInitTile = L.GridLayer.prototype._initTile
L.GridLayer.include({
  _initTile: function (tile) {
    originalInitTile.call(this, tile)
    var tileSize = this.getTileSize()
    tile.style.width = tileSize.x + 1 + 'px'
    tile.style.height = tileSize.y + 1 + 'px'
  }
})

export * as L from 'leaflet'
