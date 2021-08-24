import {L} from '../../vendor'

export default class LeafletBaseMapTool extends L.Control {
  basemapFunction
  constructor (options, basemapFunction) {
    let mergedOptions = {
      ...{
        position: 'topright',
        enabled: true
      },
      ...options
    }
    super(mergedOptions)
    this.basemapFunction = basemapFunction
  }

  onAdd () {
    const self = this

    let container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
    this._basemapLink = L.DomUtil.create('a', '', container)
    this._basemapLink.title = 'BaseMap Selection'
    this._basemapLink.innerHTML = `<svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M20.5,3L20.34,3.03L15,5.1L9,3L3.36,4.9C3.15,4.97 3,5.15 3,5.38V20.5A0.5,0.5 0 0,0 3.5,21L3.66,20.97L9,18.9L15,21L20.64,19.1C20.85,19.03 21,18.85 21,18.62V3.5A0.5,0.5 0 0,0 20.5,3M10,5.47L14,6.87V18.53L10,17.13V5.47M5,6.46L8,5.45V17.15L5,18.31V6.46M19,17.54L16,18.55V6.86L19,5.7V17.54Z" /></svg>`
    this._basemapLink.onclick = function (e) {
      self.basemapFunction()
      e.stopPropagation()
      e.preventDefault()
    }.bind(this)

    this.disable = () => {
      this._basemapLink.onclick = function () {}
      L.DomUtil.addClass(this._basemapLink, 'leaflet-control-disabled')
    }

    this.enable = () => {
      this._basemapLink.onclick = function (e) {
        self.basemapFunction()
        e.stopPropagation()
        e.preventDefault()
      }.bind(this)
      if (L.DomUtil.hasClass(this._basemapLink, 'leaflet-control-disabled')) {
        L.DomUtil.removeClass(this._basemapLink, 'leaflet-control-disabled')
      }
    }

    return container
  }
}
