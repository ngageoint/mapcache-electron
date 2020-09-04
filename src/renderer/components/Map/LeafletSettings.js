import * as vendor from '../../../lib/vendor'

export default class LeafletSettings extends vendor.L.Control {
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
    let container = vendor.L.DomUtil.create('div', 'leaflet-bar leaflet-touch leaflet-control')
    this._settingsLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-settings', container)
    this._settingsLink.onclick = this.clickHandler
    return container
  }
}
