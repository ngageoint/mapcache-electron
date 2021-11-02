/**
 * Half the world distance in either direction
 */
const WEB_MERCATOR_HALF_WORLD_WIDTH = 20037508.342789244

export default class Point {
  x
  y
  constructor (x, y) {
    this.x = x
    this.y = y
  }

  static fromLatLng (latLng) {
    const x = latLng.longitude * WEB_MERCATOR_HALF_WORLD_WIDTH / 180.0
    let y = Math.log(Math.tan((90.0 + latLng.latitude) * Math.PI / 360.0)) / (Math.PI / 180.0)
    y = y * WEB_MERCATOR_HALF_WORLD_WIDTH / 180.0
    return new Point(x, y)
  }
}
