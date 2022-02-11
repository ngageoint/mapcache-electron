import EventBus from '../../../../vue/EventBus'

function setupXYZGrid (L) {
  L.XYZGrid = L.GridLayer.extend({
    initialize: function (options) {
      L.GridLayer.prototype.initialize.call(this, options)
      this.currentId = options.id
      this.interactive = options.interactive
      this.bgColor = options.dark ? '#00000000' : '#00000000'
      this.fgColor = options.dark ? '#ddddddaa' : '#000000ff'
    },
    setDarkModeEnabled (enabled) {
      this.bgColor = enabled ? '#00000000' : '#00000000'
      this.fgColor = enabled ? '#ddddddaa' : '#000000ff'
      this.redraw()
    },
    createTile: function (coords) {
      const self = this
      // create a <canvas> element for drawing
      const tile = L.DomUtil.create(this.interactive ? 'button' : 'div', 'leaflet-tile')
      const text = 'X: ' + coords.x + ', Y: ' + coords.y + ', Z: ' + coords.z
      tile.innerHTML = '<span class="centered-label">' + text + '</span>'
      tile.style.pointerEvents = 'initial'
      tile.style.background = this.bgColor ? this.bgColor : '#4e9cca20'
      tile.style.border = '1px solid ' + (this.fgColor ? this.fgColor : '#4e9cca')
      tile.style.color = this.fgColor ? this.fgColor : '#326482'
      tile.style.fontWeight = 'bold'
      if (this.interactive) {
        L.DomEvent.on(tile, 'mouseover', function () {
          tile.style.background = '#4e9cca66'
        })
        L.DomEvent.on(tile, 'mouseout', function () {
          tile.style.background = '#4e9cca20'
        })
        L.DomEvent.on(tile, 'click', function (e) {
          e.preventDefault()
          e.stopPropagation()
          const tileBounds = self._tileCoordsToBounds(coords)
          if (self.currentId != null) {
            EventBus.$emit(EventBus.EventTypes.BOUNDING_BOX_UPDATED(self.currentId), [tileBounds._southWest.lng, tileBounds._southWest.lat, tileBounds._northEast.lng, tileBounds._northEast.lat])
          }
        })
        L.DomEvent.on(tile, 'mousedown', function () {
          tile.style.background = '#4e9cca99'
        })
        L.DomEvent.on(tile, 'mouseup', function () {
          tile.style.background = '#4e9cca66'
        })
      }
      return tile
    }
  })

  L.xyzGrid = function (options) {
    return new L.XYZGrid(options)
  }
}

export {
  setupXYZGrid
}
