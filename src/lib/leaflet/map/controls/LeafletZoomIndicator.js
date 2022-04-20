import {L} from '../../vendor'

export default class LeafletZoomIndicator extends L.Control {
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
    var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
    this._link = L.DomUtil.create('a', 'leaflet-control-zoom-indicator', container)
    this._link.innerHTML = map.getZoom()
    map.on('zoomend', () => {
      this._link.innerHTML = Math.floor(map.getZoom())
    }, this)

    return container
  }
}
