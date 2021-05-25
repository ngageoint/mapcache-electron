import { L } from '../../lib/leaflet/vendor'

export default class LeafletActiveLayersTools extends L.Control {
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

    let container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')

    if (zoomEnabled) {
      this._zoomLink = L.DomUtil.create('a', 'leaflet-control-disabled', container)
      this._zoomLink.title = 'Zoom to Active'
      this._zoomLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19,12H17V15H14V17H19V12M7,9H10V7H5V12H7V9M21,3H3A2,2 0 0,0 1,5V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V5A2,2 0 0,0 21,3M21,19H3V5H21V19Z" /></svg>`
    }

    if (clearEnabled) {
      this._clearLink = L.DomUtil.create('a', 'leaflet-control-disabled', container)
      this._clearLink.title = 'Clear Active'
      this._clearLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M3.27,1L2,2.27L6.22,6.5L3,9L4.63,10.27L12,16L14.1,14.37L15.53,15.8L12,18.54L4.63,12.81L3,14.07L12,21.07L16.95,17.22L20.73,21L22,19.73L3.27,1M19.36,10.27L21,9L12,2L9.09,4.27L16.96,12.15L19.36,10.27M19.81,15L21,14.07L19.57,12.64L18.38,13.56L19.81,15Z" /></svg>`
    }

    if (reorderEnabled) {
      this._reorderLink = L.DomUtil.create('a', 'leaflet-control-disabled', container)
      this._reorderLink.title = 'Layer Order'
      this._reorderLink.innerHTML = `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg"><g><rect fill="none" id="canvas_background" height="602" width="802" y="-1" x="-1"/></g><g><title>Layer 1</title><path fill="currentColor" id="svg_2" d="m8.33641,16.13578l6.81733,-5.30751l1.51908,-1.17636l-8.33641,-6.48387l-8.33641,6.48387l1.50982,1.17636m6.82659,7.66023l-6.83586,-5.30751l-1.50055,1.1671l8.33641,6.48387l8.33641,-6.48387l-1.50982,-1.17636l-6.82659,5.31678z"/><g fill="currentColor" id="svg_4"><path fill="currentColor" id="svg_1" d="m18.26648,11.39818l5.73352,-0.01077l-2.87463,-4.83841l-2.85889,4.84918z"/><path fill="currentColor" id="svg_3" d="m23.99987,12.62895l-5.73339,-0.04327l2.83508,4.86532l2.89831,-4.82205z"/></g></g></svg>`
    }

    this.disable = () => {
      if (zoomEnabled) {
        this._zoomLink.onclick = function () {}
        L.DomUtil.addClass(this._zoomLink, 'leaflet-control-disabled')
      }

      if (clearEnabled) {
        this._clearLink.onclick = function () {}
        L.DomUtil.addClass(this._clearLink, 'leaflet-control-disabled')
      }

      if (reorderEnabled) {
        this._reorderLink.onclick = function () {}
        L.DomUtil.addClass(this._reorderLink, 'leaflet-control-disabled')
      }
    }

    this.enable = () => {
      if (zoomEnabled) {
        this._zoomLink.onclick = function (e) {
          self.zoomToActiveLayers()
          e.stopPropagation()
          e.preventDefault()
        }.bind(this)
        if (L.DomUtil.hasClass(this._zoomLink, 'leaflet-control-disabled')) {
          L.DomUtil.removeClass(this._zoomLink, 'leaflet-control-disabled')
        }
      }

      if (clearEnabled) {
        this._clearLink.onclick = function (e) {
          self.clearActiveLayers()
          e.stopPropagation()
          e.preventDefault()
        }.bind(this)
        if (L.DomUtil.hasClass(this._clearLink, 'leaflet-control-disabled')) {
          L.DomUtil.removeClass(this._clearLink, 'leaflet-control-disabled')
        }
      }

      if (reorderEnabled) {
        this._reorderLink.onclick = function (e) {
          self.reorderLayers()
          e.stopPropagation()
          e.preventDefault()
        }.bind(this)
        if (L.DomUtil.hasClass(this._reorderLink, 'leaflet-control-disabled')) {
          L.DomUtil.removeClass(this._reorderLink, 'leaflet-control-disabled')
        }
      }
    }

    return container
  }
}
