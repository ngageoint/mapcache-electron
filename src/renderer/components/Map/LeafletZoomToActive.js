import * as vendor from '../../../lib/vendor'

export default class LeafletZoomToActive extends vendor.L.Control {
  clickHandler
  constructor (options, clickHandler) {
    let mergedOptions = {
      ...{
        position: 'topright',
        enabled: true
      },
      ...options
    }
    super(mergedOptions)
    this.clickHandler = clickHandler
  }

  onAdd (map) {
    let container = vendor.L.DomUtil.create('div', 'leaflet-bar leaflet-control')
    this._zoomLink = vendor.L.DomUtil.create('a', 'leaflet-control-zoom-to-active', container)
    this._zoomLink.title = 'Zoom to Active'
    this._zoomLink.onclick = this.clickHandler
    return container
  }
}
