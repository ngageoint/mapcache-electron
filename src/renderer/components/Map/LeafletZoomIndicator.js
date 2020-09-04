import * as vendor from '../../../lib/vendor'

export default class LeafletZoomIndicator extends vendor.L.Control {
  constructor (options) {
    let mergedOptions = {
      ...{
        position: 'topright',
        enabled: true
      },
      ...options
    }
    super(mergedOptions)
  }

  onAdd (map) {
    var container = vendor.L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-zoom-indicator')
    this._link = vendor.L.DomUtil.create('a', '', container)
    this._link.innerHTML = map.getZoom()
    map.on('zoomend', () => {
      this._link.innerHTML = map.getZoom()
    }, this)

    return container
  }
}
