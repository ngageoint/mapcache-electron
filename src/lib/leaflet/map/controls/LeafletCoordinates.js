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
    this.updateCoordinateText(LeafletCoordinates.getCoordinateText(this.coordinate, type, this.zoom))
  }

  updateCoordinateText (text) {
    this._link.innerHTML = text
  }

  static getCoordinateText (coordinate, coordinateType, zoom) {
    let text = ''
    if (coordinate != null && coordinateType != null) {
      if (coordinateType === 'LatLng') {
        text = 'Lat, Lng: ' + coordinate.lat.toFixed(6) + ', ' + coordinate.lng.toFixed(6)
      } else if (coordinateType === 'MGRS') {
        const mgrs = MGRS.from(new LatLng(coordinate.lat, coordinate.lng))
        text = 'MGRS: ' + mgrs.toString()
      } else if (coordinateType === 'GARS') {
        const gars = latLng2GARS(coordinate.lat, coordinate.lng)
        text = 'GARS: ' + gars
      } else if (coordinateType === 'XYZ') {
        const x = long2tile(coordinate.lng, zoom)
        const y = lat2tile(coordinate.lat, zoom)
        text = 'x: ' + x + ', y: ' + y + ', z: ' + zoom
      }
    }
    return text
  }

  onAdd (map) {
    const container = L.DomUtil.create('div', 'leaflet-control leaflet-coordinates-control')
    this._link = L.DomUtil.create('span', 'leaflet-coordinates', container)
    this.coordinate = map.getCenter()
    this.zoom = map.getZoom()

    map.on('mousemove', function (event) {
      this.coordinate = event.latlng
      this.updateCoordinateText(LeafletCoordinates.getCoordinateText(event.latlng, this.coordinateType, this.zoom))
    }.bind(this))

    map.on('zoomend', function () {
      this.zoom = map.getZoom()
      this.updateCoordinateText(LeafletCoordinates.getCoordinateText(this.coordinate, this.coordinateType, map.getZoom()))
    }.bind(this))

    this.updateCoordinateText(LeafletCoordinates.getCoordinateText(this.coordinate, this.coordinateType, this.zoom))

    return container
  }
}
