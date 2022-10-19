import { L } from '../../vendor'
import debounce from 'lodash/debounce'
import throttle from 'lodash/throttle'

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

  updateIndicator (map) {
    this._link.innerHTML = map.getZoom().toFixed(1)
  }

  onAdd (map) {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
    this._link = L.DomUtil.create('a', 'leaflet-control-zoom-indicator', container)
    this.updateIndicator(map)
    const debounceUpdateIndicator = debounce(() => {
      this.updateIndicator(map)
    }, 50)
    const throttleUpdateIndicator = throttle(() => {
      this.updateIndicator(map)
    }, 50)
    map.on('zoom', throttleUpdateIndicator)
    map.on('zoomend', debounceUpdateIndicator)
    return container
  }
}
