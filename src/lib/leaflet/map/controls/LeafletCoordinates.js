import {L} from '../../vendor'
import {LatLng} from '../grid/mgrs/wgs84/LatLng'
import {MGRS} from '../grid/mgrs/MGRS'
import {lat2tile, long2tile} from '../../../util/xyz/XYZTileUtilities'
import {latLng2GARS} from '../grid/gars/GARS'

export default class LeafletCoordinates extends L.Control {
  coordinateType = 'LatLng'
  coordinate
  zoom

  constructor (options) {
    let mergedOptions = {
      ...{
        position: 'bottomleft',
        enabled: true
      },
      ...options
    }
    super(mergedOptions)
  }

  setCoordinateType (type) {
    this.coordinateType = type
    this.updateText(this.coordinate, type)
  }

  updateText (coordinate, coordinateType) {
    if (coordinate != null && coordinateType != null) {
      if (coordinateType === 'LatLng') {
        this._link.innerHTML = 'Lat, Lng: ' + coordinate.lat.toFixed(6) + ', ' + coordinate.lng.toFixed(6)
      } else if (coordinateType === 'MGRS') {
        const mgrs = MGRS.from(new LatLng(coordinate.lat, coordinate.lng))
        this._link.innerHTML = 'MGRS: ' + mgrs.toString()
      } else if (coordinateType === 'GARS') {
        const gars = latLng2GARS(coordinate.lat, coordinate.lng)
        this._link.innerHTML = 'GARS: ' + gars
      } else if (coordinateType === 'XYZ') {
        const x = long2tile(coordinate.lng, this.zoom)
        const y = lat2tile(coordinate.lat, this.zoom)
        this._link.innerHTML = 'x: ' + x + ', y: ' + y + ', z: ' + this.zoom
      }
    }
  }

  onAdd (map) {
    const container = L.DomUtil.create('div', 'leaflet-control leaflet-coordinates-control')
    this._link = L.DomUtil.create('span', 'leaflet-coordinates', container)
    this.coordinate = map.getCenter()
    this.zoom = map.getZoom()

    map.on('mousemove', (event) => {
      this.coordinate = event.latlng
      this.updateText(event.latlng, this.coordinateType)
    })

    map.on('zoomend', () => {
      this.zoom = map.getZoom()
      this.updateText(this.coordinate, this.coordinateType)
    }, this)

    this.updateText()

    return container
  }
}
