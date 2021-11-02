import { UTM } from '../utm/UTM'
import { LatLng } from '../wgs84/LatLng'
import { get100KId } from '../MGRS'
import { Label } from '../Label'
// import {extentIntersection} from '../../../../../util/tile/TileUtilities'
import intersect from '@turf/intersect'

export default class GridZoneDesignator {
  zoneLetter
  hemisphere
  zoneNumber
  zoneBounds
  zoneUtmBounds
  zonePolygon

  constructor (zoneLetter, zoneNumber, zoneBounds) {
    this.zoneLetter = zoneLetter
    this.hemisphere = zoneLetter < 'N' ? UTM.HEMISPHERE.SOUTH : UTM.HEMISPHERE.NORTH
    this.zoneNumber = zoneNumber
    this.zoneBounds = zoneBounds

    const ll = UTM.from(new LatLng(zoneBounds[1], zoneBounds[0]), zoneNumber, this.hemisphere)
    const lr = UTM.from(new LatLng(zoneBounds[1], zoneBounds[2]), zoneNumber, this.hemisphere)
    const ul = UTM.from(new LatLng(zoneBounds[3], zoneBounds[0]), zoneNumber, this.hemisphere)
    const ur = UTM.from(new LatLng(zoneBounds[3], zoneBounds[2]), zoneNumber, this.hemisphere)
    this.zoneUtmBounds = [
      Math.min(ll.getEasting(), ul.getEasting()),
      Math.min(ll.getNorthing(), lr.getNorthing()),
      Math.max(lr.getEasting(), ur.getEasting()),
      Math.max(ul.getNorthing(), ur.getNorthing())
    ]
    this.zonePolygon = this.generatePolygon([[
      [zoneBounds[0], zoneBounds[1]],
      [zoneBounds[0], zoneBounds[3]],
      [zoneBounds[2], zoneBounds[3]],
      [zoneBounds[2], zoneBounds[1]],
      [zoneBounds[0], zoneBounds[1]]]])
  }

  getLabelText () {
    return this.zoneNumber.toString() + this.zoneLetter
  }

  getCenter () {
    const halfWidth = (this.zoneBounds[2] - this.zoneBounds[0]) / 2.0
    const halfHeight = (this.zoneBounds[3] - this.zoneBounds[1]) / 2.0
    return new LatLng(this.zoneBounds[1] + halfHeight, this.zoneBounds[0] + halfWidth)
  }

  getZoneLetter () {
    return this.zoneLetter
  }

  getZoneNumber () {
    return this.zoneNumber
  }

  getZoneBounds () {
    return this.zoneBounds
  }

  within (bbox) {
    return (this.zoneBounds[1] <= bbox[3] && this.zoneBounds[3] >= bbox[1]) && (this.zoneBounds[0] <= bbox[2]) && (this.zoneBounds[2] >= bbox[0])
  }

  generatePolygon (coordinates) {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: coordinates
      }
    }
  }

  /**
   * Generates the polygon and label
   * @param boundingBox
   * @param precision
   * @param easting
   * @param northing
   * @param newEasting
   * @param newNorthing
   * @param polygons
   * @param labels
   * @return {{polygons: *[], labels: *[]}}
   */
  generatePolygonAndLabel (boundingBox, precision = 0, easting, northing, newEasting, newNorthing, polygons, labels) {
    let ll = LatLng.from(new UTM(this.zoneNumber, this.hemisphere, easting, northing))
    let ul = LatLng.from(new UTM(this.zoneNumber, this.hemisphere, easting, newNorthing))
    let ur = LatLng.from(new UTM(this.zoneNumber, this.hemisphere, newEasting, newNorthing))
    let lr = LatLng.from(new UTM(this.zoneNumber, this.hemisphere, newEasting, northing))
    const intersection = intersect(this.generatePolygon([[ll.asArray(), ul.asArray(), ur.asArray(), lr.asArray(), ll.asArray()]]), this.zonePolygon)
    if (intersection != null) {
      polygons.push(intersection)
      ll = new LatLng(intersection.geometry.coordinates[0][0][1], intersection.geometry.coordinates[0][0][0])
      ul = new LatLng(intersection.geometry.coordinates[0][1][1], intersection.geometry.coordinates[0][1][0])
      ur = new LatLng(intersection.geometry.coordinates[0][2][1], intersection.geometry.coordinates[0][2][0])
      lr = new LatLng(intersection.geometry.coordinates[0][3][1], intersection.geometry.coordinates[0][3][0])
      if (precision === 100000) {
        // determine center easting/northing given the bounds, then convert to lat/lng
        const utm1 = UTM.from(ll, this.zoneNumber, this.hemisphere)
        const utm2 = UTM.from(ul, this.zoneNumber, this.hemisphere)
        const utm3 = UTM.from(ur, this.zoneNumber, this.hemisphere)
        const utm4 = UTM.from(lr, this.zoneNumber, this.hemisphere)
        const minEasting = Math.min(utm1.getEasting(), utm2.getEasting())
        const maxEasting = Math.max(utm3.getEasting(), utm4.getEasting())
        const minNorthing = Math.min(utm1.getNorthing(), utm4.getNorthing())
        const maxNorthing = Math.max(utm2.getNorthing(), utm3.getNorthing())
        const labelCenter = LatLng.from(new UTM(this.zoneNumber, this.hemisphere, minEasting + ((maxEasting - minEasting) / 2), minNorthing + ((maxNorthing - minNorthing) / 2)))

        const intersectionBounds = [
          Math.min(ll.longitude, ul.longitude),
          Math.min(ll.latitude, lr.latitude),
          Math.max(lr.longitude, ur.longitude),
          Math.max(ul.latitude, ur.latitude)
        ]
        labels.push(new Label(get100KId(easting, northing, this.zoneNumber), labelCenter, intersectionBounds, this.zoneLetter, this.zoneNumber))
      }
    }
  }

  /**
   * Return zone polygons at provided precision
   * @param boundingBox
   * @param precision
   * @return {*[]}
   */
  polygonsAndLabelsInBounds (boundingBox, precision = 0) {
    const polygons = []
    const labels = []
    if (precision === 0) {
      polygons.push(this.generatePolygon([[[this.zoneBounds[0], this.zoneBounds[1]], [this.zoneBounds[0], this.zoneBounds[3]], [this.zoneBounds[2], this.zoneBounds[3]], [this.zoneBounds[2], this.zoneBounds[1]], [this.zoneBounds[0], this.zoneBounds[1]]]]))
      labels.push(new Label(this.getLabelText(), this.getCenter(), this.zoneBounds, this.zoneLetter, this.zoneNumber))
    } else {
      const minLat = Math.max(boundingBox[1], this.zoneBounds[1])
      const maxLat = Math.min(boundingBox[3], this.zoneBounds[3])
      const minLon = Math.max(boundingBox[0], this.zoneBounds[0])
      const maxLon = Math.min(boundingBox[2], this.zoneBounds[2])

      if (this.hemisphere === UTM.HEMISPHERE.NORTH) {
        const lowerLeftUTM = UTM.from(new LatLng(minLat, minLon), this.zoneNumber, this.hemisphere)
        let lowerLeftEasting = (Math.floor(lowerLeftUTM.getEasting() / precision) * precision)
        let lowerLeftNorthing = (Math.floor(lowerLeftUTM.getNorthing() / precision) * precision)

        const upperRightUTM = UTM.from(new LatLng(maxLat, maxLon), this.zoneNumber, this.hemisphere)
        let endEasting = (Math.ceil(upperRightUTM.getEasting() / precision) * precision)
        let endNorthing = (Math.ceil(upperRightUTM.getNorthing() / precision) * precision)

        let easting = lowerLeftEasting
        while (easting <= endEasting) {
          let newEasting = easting + precision
          let northing = lowerLeftNorthing
          while (northing <= endNorthing) {
            let newNorthing = northing + precision
            this.generatePolygonAndLabel(boundingBox, precision, easting, northing, newEasting, newNorthing, polygons, labels)
            northing = newNorthing
          }
          easting = newEasting
        }
      } else {
        let upperLeftUTM = UTM.from(new LatLng(maxLat, minLon), this.zoneNumber, this.hemisphere)
        let upperLeftEasting = (Math.floor(upperLeftUTM.getEasting() / precision) * precision)
        let upperLeftNorthing = (Math.ceil(upperLeftUTM.getNorthing() / precision + 1) * precision)
        if (this.zoneLetter === 'M') {
          upperLeftNorthing = 10000000.0
          upperLeftUTM = new UTM(upperLeftUTM.getZoneNumber(), UTM.HEMISPHERE.SOUTH, upperLeftUTM.getEasting(), upperLeftUTM.getNorthing())
        }
        const lowerRightUTM = UTM.from(new LatLng(minLat, maxLon), this.zoneNumber, this.hemisphere)
        const lowerRightEasting = (Math.ceil(lowerRightUTM.getEasting() / precision) * precision)
        const lowerRightNorthing = (Math.floor(lowerRightUTM.getNorthing() / precision) * precision)
        for (let easting = upperLeftEasting; easting <= lowerRightEasting; easting += precision) {
          let northing = upperLeftNorthing
          while (northing >= lowerRightNorthing) {
            let newNorthing = northing - precision
            this.generatePolygonAndLabel(boundingBox, precision, easting, newNorthing, easting + precision, northing, polygons, labels)
            northing = newNorthing
          }
        }
      }
    }

    return {polygons, labels}
  }
}
