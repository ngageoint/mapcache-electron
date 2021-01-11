import * as vendor from '../../lib/vendor'

export default class LeafletActiveLayersTools extends vendor.L.Control {
  zoomToActiveLayers
  clearActiveLayers
  reorderLayers
  constructor (options, zoomToActiveLayers, clearActiveLayers, reorderLayers) {
    let mergedOptions = {
      ...{
        position: 'topright',
        enabled: true
      },
      ...options
    }
    super(mergedOptions)
    this.zoomToActiveLayers = zoomToActiveLayers
    this.clearActiveLayers = clearActiveLayers
    this.reorderLayers = reorderLayers
  }

  onAdd () {
    const self = this

    const zoomEnabled = this.zoomToActiveLayers !== null && this.zoomToActiveLayers !== undefined
    const clearEnabled = this.clearActiveLayers !== null && this.clearActiveLayers !== undefined
    const reorderEnabled = this.reorderLayers !== null && this.reorderLayers !== undefined

    let container = vendor.L.DomUtil.create('div', 'leaflet-bar leaflet-control')

    if (zoomEnabled) {
      this._zoomLink = vendor.L.DomUtil.create('a', 'leaflet-control-zoom-to-active leaflet-control-disabled', container)
      this._zoomLink.title = 'Zoom to Active'
    }

    if (clearEnabled) {
      this._clearLink = vendor.L.DomUtil.create('a', 'leaflet-control-clear-active leaflet-control-disabled', container)
      this._clearLink.title = 'Clear Active'
    }

    if (reorderEnabled) {
      this._reorderLink = vendor.L.DomUtil.create('a', 'leaflet-control-layer-ordering leaflet-control-disabled', container)
      this._reorderLink.title = 'Layer Order'
    }

    this.disable = () => {
      if (zoomEnabled) {
        this._zoomLink.onclick = function () {}
        vendor.L.DomUtil.addClass(this._zoomLink, 'leaflet-control-disabled')
      }

      if (clearEnabled) {
        this._clearLink.onclick = function () {}
        vendor.L.DomUtil.addClass(this._clearLink, 'leaflet-control-disabled')
      }

      if (reorderEnabled) {
        this._reorderLink.onclick = function () {}
        vendor.L.DomUtil.addClass(this._reorderLink, 'leaflet-control-disabled')
      }
    }

    this.enable = () => {
      if (zoomEnabled) {
        this._zoomLink.onclick = function (e) {
          self.zoomToActiveLayers()
          e.stopPropagation()
          e.preventDefault()
        }.bind(this)
        if (vendor.L.DomUtil.hasClass(this._zoomLink, 'leaflet-control-disabled')) {
          vendor.L.DomUtil.removeClass(this._zoomLink, 'leaflet-control-disabled')
        }
      }

      if (clearEnabled) {
        this._clearLink.onclick = function (e) {
          self.clearActiveLayers()
          e.stopPropagation()
          e.preventDefault()
        }.bind(this)
        if (vendor.L.DomUtil.hasClass(this._clearLink, 'leaflet-control-disabled')) {
          vendor.L.DomUtil.removeClass(this._clearLink, 'leaflet-control-disabled')
        }
      }

      if (reorderEnabled) {
        this._reorderLink.onclick = function (e) {
          self.reorderLayers()
          e.stopPropagation()
          e.preventDefault()
        }.bind(this)
        if (vendor.L.DomUtil.hasClass(this._reorderLink, 'leaflet-control-disabled')) {
          vendor.L.DomUtil.removeClass(this._reorderLink, 'leaflet-control-disabled')
        }
      }
    }

    return container
  }
}
