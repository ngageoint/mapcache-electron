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
    this.updateText()
  }

  updateText () {
    if (this.coordinateType === 'LatLng') {
      this._link.innerHTML = 'Lat, Lng: ' + this.coordinate.lat.toFixed(6) + ', ' + this.coordinate.lng.toFixed(6)
    } else if (this.coordinateType === 'MGRS') {
      const mgrs = MGRS.from(new LatLng(this.coordinate.lat, this.coordinate.lng))
      this._link.innerHTML = 'MGRS: ' + mgrs.toString()
    } else if (this.coordinateType === 'GARS') {
      const gars = latLng2GARS(this.coordinate.lat, this.coordinate.lng)
      this._link.innerHTML = 'GARS: ' + gars
    } else if (this.coordinateType === 'XYZ') {
      const x = long2tile(this.coordinate.lng, this.zoom)
      const y = lat2tile(this.coordinate.lat, this.zoom)
      this._link.innerHTML = 'x: ' + x + ', y: ' + y + ', z: ' + this.zoom
    }
  }

  onAdd (map) {
    const container = L.DomUtil.create('div', 'leaflet-control leaflet-coordinates-control')
    this._link = L.DomUtil.create('span', 'leaflet-coordinates', container)
    this.coordinate = map.getCenter()
    this.zoom = map.getZoom()

    map.on('mousemove', (e) => {
      this.coordinate = e.latlng
      this.updateText()
    })

    map.on('zoomend', () => {
      this.zoom = map.getZoom()
      this.updateText()
    }, this)

    this.updateText()

    return container
  }
}
