import { L } from '../../vendor.js'

export default class LeafletGridOverlayTool extends L.Control {
  gridFunction

  constructor (options, gridFunction) {
    let mergedOptions = {
      ...{
        position: 'topright',
        enabled: true
      },
      ...options
    }
    super(mergedOptions)
    this.gridFunction = gridFunction
  }

  onAdd () {
    const self = this
    let container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
    this._gridLink = L.DomUtil.create('a', '', container)
    this._gridLink.title = 'Grid Selection'
    this._gridLink.innerHTML = `<svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M10,4V8H14V4H10M16,4V8H20V4H16M16,10V14H20V10H16M16,16V20H20V16H16M14,20V16H10V20H14M8,20V16H4V20H8M8,14V10H4V14H8M8,8V4H4V8H8M10,14H14V10H10V14M4,2H20A2,2 0 0,1 22,4V20A2,2 0 0,1 20,22H4C2.92,22 2,21.1 2,20V4A2,2 0 0,1 4,2Z" /></svg>`
    this._gridLink.onclick = function (e) {
      self.gridFunction()
      e.stopPropagation()
      e.preventDefault()
    }.bind(this)

    this.disable = () => {
      this._gridLink.onclick = function () {
      }
      L.DomUtil.addClass(this._gridLink, 'leaflet-control-disabled')
    }

    this.enable = () => {
      this._gridLink.onclick = function (e) {
        self.gridFunction()
        e.stopPropagation()
        e.preventDefault()
      }.bind(this)
      if (L.DomUtil.hasClass(this._gridLink, 'leaflet-control-disabled')) {
        L.DomUtil.removeClass(this._gridLink, 'leaflet-control-disabled')
      }
    }

    return container
  }
}
