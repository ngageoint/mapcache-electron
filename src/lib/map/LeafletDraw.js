import * as vendor from '../vendor'

export default class LeafletDraw extends vendor.L.Control {
  constructor (options) {
    let mergedOptions = {
      ...{
        position: 'topleft',
        enabled: true
      },
      ...options
    }
    super(mergedOptions)
  }

  onAdd (map) {
    let container = vendor.L.DomUtil.create('div', 'leaflet-bar leaflet-touch leaflet-control')
    this._pointLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-point', container)
    this._pointLink.onclick = () => {
      map.editTools.startMarker()
    }
    this._polyLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-polygon', container)
    this._polyLink.onclick = () => {
      map.editTools.startPolygon()
    }
    this._rectLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-rectangle', container)
    this._rectLink.onclick = () => {
      map.editTools.startRectangle()
    }
    this._linestringLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-linestring', container)
    this._linestringLink.onclick = () => {
      map.editTools.startPolyline()
    }
    this._trashLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-circle', container)
    this._trashLink.onclick = () => {
      map.editTools.startCircle()
    }
    return container
  }
}
