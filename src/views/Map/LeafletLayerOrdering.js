/* eslint-disable no-empty */
import * as vendor from '../../lib/vendor'
import EventBus from '../../EventBus'

export default class LeafletLayerOrdering extends vendor.L.Control {
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

  onAdd () {
    let container = vendor.L.DomUtil.create('div', 'leaflet-bar leaflet-touch leaflet-control')
    this._reorderLink = vendor.L.DomUtil.create('a', 'leaflet-control-layer-ordering leaflet-control-disabled', container)
    this._reorderLink.id = 'order-map-layers-control'
    this._reorderLink.title = 'Layer Order'

    const reorderFunction = function (e) {
      EventBus.$emit('toggle-layer-render-order')
      e.stopPropagation()
      e.preventDefault()
    }.bind(this)

    this.disable = () => {
      this._reorderLink.onclick = function () {}
      vendor.L.DomUtil.addClass(this._reorderLink, 'leaflet-control-disabled')
    }

    this.enable = () => {
      this._reorderLink.onclick = reorderFunction
      if (vendor.L.DomUtil.hasClass(this._reorderLink, 'leaflet-control-disabled')) {
        vendor.L.DomUtil.removeClass(this._reorderLink, 'leaflet-control-disabled')
      }
    }

    return container
  }
}
