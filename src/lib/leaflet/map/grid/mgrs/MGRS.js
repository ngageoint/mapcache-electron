import { UTM } from './utm/UTM'
import { LatLng } from './wgs84/LatLng'

class MGRS {
  /*
   * Latitude bands C..X 8° each, covering 80°S to 84°N
   */
  static latBands = 'CDEFGHJKLMNPQRSTUVWXX' // X is repeated for 80-84°N

  /*
   * 100km grid square column (‘e’) letters repeat every third zone
   */
  static e100kLetters = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ']

  /*
   * 100km grid square row (‘n’) letters repeat every other zone
   */
  static n100kLetters = ['ABCDEFGHJKLMNPQRSTUV', 'FGHJKLMNPQRSTUVABCDE']

  static mgrsPattern = /^(\d{1,2})([^ABIOYZabioyz])([A-Za-z]{2})([0-9][0-9]+$)/

  zone
  band
  e100k
  n100k
  easting
  northing

  constructor (zone, band, e100k, n100k, easting, northing) {
    this.zone = zone
    this.band = band
    this.e100k = e100k
    this.n100k = n100k
    this.easting = easting
    this.northing = northing
  }

  getZone () {
    return this.zone
  }

  getBand () {
    return this.band
  }

  getE100k () {
    return this.e100k
  }

  getN100k () {
    return this.n100k
  }

  getEasting () {
    return this.easting
  }

  getNorthing () {
    return this.northing
  }

  /**
   * Return whether the given string is valid MGRS string
   *
   * @param mgrs string to test
   * @return true if MGRS string is valid, false otherwise.
   */
  isMGRS (mgrs) {
    return mgrs.match(MGRS.mgrsPattern) != null
  }

  /**
   * Encodes a latitude/longitude as MGRS string.
   * @param latLng
   * @return mgrs.
   */
  static from (latLng) {
    latLng.longitude = fixLongitude(latLng.longitude)
    let utm = UTM.from(latLng)

    // grid zones are 8° tall, 0°N is 10th band
    let band = MGRS.latBands.charAt(Math.floor(latLng.latitude / 8.0 + 10.0)) // latitude band

    // columns in zone 1 are A-H, zone 2 J-R, zone 3 S-Z, then repeating every 3rd zone
    let column = Math.floor(utm.getEasting() / 100000)
    let e100k = MGRS.e100kLetters[(utm.getZoneNumber() - 1) % 3].charAt(column - 1) // col-1 since 1*100e3 -> A (index 0), 2*100e3 -> B (index 1), etc.

    // rows in even zones are A-V, in odd zones are F-E
    let row = Math.floor(utm.getNorthing() / 100000) % 20
    let n100k = MGRS.n100kLetters[(utm.getZoneNumber() - 1) % 2].charAt(row)

    // truncate easting/northing to within 100km grid square
    let easting = Math.round(utm.getEasting() % 100000)
    let northing = Math.round(utm.getNorthing() % 100000)

    return new MGRS(utm.getZoneNumber(), band, e100k, n100k, easting, northing)
  }

  parse (mgrs) {
    const matches = mgrs.match(MGRS.mgrsPattern)
    if (matches == null) {
      throw new Error('Invalid MGRS')
    }

    const zone = parseInt(matches[1])
    const band = matches[2]
    const e100k = matches[3].substring(0, 1)
    const n100k = matches[3].substring(1)

    const numericLocation = matches[4]
    const precision = numericLocation.length() / 2
    const numericLocations = [numericLocation.substring(0, precision), numericLocation.substring(precision)]

    // parse easting & northing
    const multiplier = Math.pow(10.0, 5 - precision)
    const easting = parseFloat(numericLocations[0]) * multiplier
    const northing = parseFloat(numericLocations[1]) * multiplier

    return new MGRS(zone, band, e100k, n100k, easting, northing)
  }

  toString () {
    return this.zone + this.band + ' ' + this.e100k + this.n100k + ' ' + this.easting + ' ' + this.northing
  }

  utm () {
    // get easting specified by e100k
    let col = MGRS.e100kLetters[(this.zone - 1) % 3].indexOf(this.e100k) + 1 // index+1 since A (index 0) -> 1*100e3, B (index 1) -> 2*100e3, etc.
    let e100kNum = col * 100000 // e100k in meters

    // get northing specified by n100k
    let row = MGRS.n100kLetters[(this.zone - 1) % 2].indexOf(this.n100k)
    let n100kNum = row * 100000 // n100k in meters

    // get latitude of (bottom of) band
    let latBand = (MGRS.latBands.indexOf(this.band) - 10) * 8;

    // northing of bottom of band, extended to include entirety of bottommost 100km square
    // (100km square boundaries are aligned with 100km UTM northing intervals)

    let nBand = Math.floor(UTM.from(new LatLng(latBand, 0)).getNorthing() / 100000) * 100000

    // 100km grid square row letters repeat every 2,000km north; add enough 2,000km blocks to get
    // into required band
    let n2M = 0 // northing of 2,000km block
    while (n2M + n100kNum + this.northing < nBand) {
      n2M += 2000000
    }

    let hemisphere = this.band >= 'N' ? UTM.HEMISPHERE.NORTH : UTM.HEMISPHERE.SOUTH

    return new UTM(this.zone, hemisphere, e100kNum + this.easting, n2M + n100kNum + this.northing)
  }
}

function fixLongitude (lng) {
  while (lng > 180.0) {
    lng -= 360.0
  }
  while (lng < -180.0) {
    lng += 360.0
  }
  return lng
}

/**
 * Get the two letter 100k designator for a given UTM easting,
 * northing and zone number value.
 *
 * @private
 * @param {number} easting
 * @param {number} northing
 * @param {number} zoneNumber
 * @return the two letter 100k designator for the given UTM location.
 */
function get100KId (easting, northing, zoneNumber) {
  // columns in zone 1 are A-H, zone 2 J-R, zone 3 S-Z, then repeating every 3rd zone
  let column = Math.floor(easting / 100000)
  let e100k = MGRS.e100kLetters[(zoneNumber - 1) % 3].charAt(column - 1) // col-1 since 1*100e3 -> A (index 0), 2*100e3 -> B (index 1), etc.

  // rows in even zones are A-V, in odd zones are F-E
  let row = Math.floor(northing / 100000) % 20
  let n100k = MGRS.n100kLetters[(zoneNumber - 1) % 2].charAt(row)

  return e100k.toString() + n100k.toString()
}

export {
  MGRS,
  get100KId,
  fixLongitude
}
