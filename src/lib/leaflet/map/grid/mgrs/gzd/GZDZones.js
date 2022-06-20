/* eslint-disable no-unused-vars */
import GridZoneDesignator from './GridZoneDesignator'
import { fixLongitude } from '../MGRS'

const interestingZones = {
  X: [[9, 29], [31, 31], [33, 33], [35, 35], [37, 57]],
  W: [[1, 60]],
  V: [[1, 24], [27, 60]],
  U: [[1, 5], [8, 22], [29, 60]],
  T: [[9, 22], [29, 56]],
  S: [[10, 20], [25, 54]],
  R: [[1, 3], [11, 18], [27, 54], [56, 56]],
  Q: [[2, 5], [11, 20], [26, 51], [55], [58]],
  P: [[12, 12], [14, 21], [26, 40], [42, 44], [46, 59]],
  N: [[1, 1], [3, 4], [15, 22], [28, 39], [43, 44], [46, 60]],
  M: [[1, 5], [7, 7], [15, 25], [29, 29], [31, 40], [42, 43], [47, 60]],
  L: [[1, 8], [17, 25], [29, 30], [32, 40], [47, 60]],
  K: [[1, 9], [18, 26], [29, 30], [32, 41], [49, 60]],
  J: [[1, 1], [6, 7], [9, 10], [12, 13], [17, 23], [33, 38], [49, 57], [59, 59]],
  H: [[17, 22], [28, 28], [33, 36], [43, 44], [49, 56], [59, 60]],
  G: [[1, 2], [18, 20], [29, 29], [37, 37], [39, 40], [54, 56], [58, 60]],
  F: [[18, 21], [23, 25], [31, 31], [42, 43], [57, 60]],
  E: [[23, 23], [26, 26]],
}

const longitudeGZDZones = {
  1: [-180.0, -174.0],
  2: [-174.0, -168.0],
  3: [-168.0, -162.0],
  4: [-162.0, -156.0],
  5: [-156.0, -150.0],
  6: [-150.0, -144.0],
  7: [-144.0, -138.0],
  8: [-138.0, -132.0],
  9: [-132.0, -126.0],
  10: [-126.0, -120.0],
  11: [-120.0, -114.0],
  12: [-114.0, -108.0],
  13: [-108.0, -102.0],
  14: [-102.0, -96.0],
  15: [-96.0, -90.0],
  16: [-90.0, -84.0],
  17: [-84.0, -78.0],
  18: [-78.0, -72.0],
  19: [-72.0, -66.0],
  20: [-66.0, -60.0],
  21: [-60.0, -54.0],
  22: [-54.0, -48.0],
  23: [-48.0, -42.0],
  24: [-42.0, -36.0],
  25: [-36.0, -30.0],
  26: [-30.0, -24.0],
  27: [-24.0, -18.0],
  28: [-18.0, -12.0],
  29: [-12.0, -6.0],
  30: [-6.0, 0.0],
  31: [0.0, 6.0],
  32: [6.0, 12.0],
  33: [12.0, 18.0],
  34: [18.0, 24.0],
  35: [24.0, 30.0],
  36: [30.0, 36.0],
  37: [36.0, 42.0],
  38: [42.0, 48.0],
  39: [48.0, 54.0],
  40: [54.0, 60.0],
  41: [60.0, 66.0],
  42: [66.0, 72.0],
  43: [72.0, 78.0],
  44: [78.0, 84.0],
  45: [84.0, 90.0],
  46: [90.0, 96.0],
  47: [96.0, 102.0],
  48: [102.0, 108.0],
  49: [108.0, 114.0],
  50: [114.0, 120.0],
  51: [120.0, 126.0],
  52: [126.0, 132.0],
  53: [132.0, 138.0],
  54: [138.0, 144.0],
  55: [144.0, 150.0],
  56: [150.0, 156.0],
  57: [156.0, 162.0],
  58: [162.0, 168.0],
  59: [168.0, 174.0],
  60: [174.0, 180.0],
}

const latitudeGZDZones = {
  C: [-80.0, -72.0],
  D: [-72.0, -64.0],
  E: [-64.0, -56.0],
  F: [-56.0, -48.0],
  G: [-48.0, -40.0],
  H: [-40.0, -32.0],
  J: [-32.0, -24.0],
  K: [-24.0, -16.0],
  L: [-16.0, -8.0],
  M: [-8.0, 0.0],
  N: [0.0, 8.0],
  P: [8.0, 16.0],
  Q: [16.0, 24.0],
  R: [24.0, 32.0],
  S: [32.0, 40.0],
  T: [40.0, 48.0],
  U: [48.0, 56.0],
  V: [56.0, 64.0],
  W: [64.0, 72.0],
  X: [72.0, 84.0],
}

/**
 * Min zone number in Svalbard grid zones
 */
const MIN_SVALBARD_ZONE_NUMBER = 31

/**
 * Max zone number in Svalbard grid zones
 */
const MAX_SVALBARD_ZONE_NUMBER = 37

/**
 * Band letter in Svalbard grid zones
 */
const SVALBARD_BAND_LETTER = 'X'

/**
 * Min zone number in Norway grid zones
 */
const MIN_NORWAY_ZONE_NUMBER = 31

/**
 * Max zone number in Norway grid zones
 */
const MAX_NORWAY_ZONE_NUMBER = 32

/**
 * Band letter in Norway grid zones
 */
const NORWAY_BAND_LETTER = 'V'

/**
 * Minimum grid zone number
 */
const MIN_ZONE_NUMBER = 1

/**
 * Maximum grid zone number
 */
const MAX_ZONE_NUMBER = 60

/**
 * Grid zone width
 */
const ZONE_WIDTH = 6.0

/**
 * Minimum grid band letter
 */
const MIN_BAND_LETTER = 'C'

/**
 * Maximum grid band letter
 */
const MAX_BAND_LETTER = 'X'

/**
 * Minimum longitude
 */
const MIN_LON = -180.0

/**
 * Maximum longitude
 */
const MAX_LON = 180.0

/**
 * Minimum latitude
 */
const MIN_LAT = -80.0

/**
 * Maximum latitude
 */
const MAX_LAT = 84.0

/**
 * Number of bands
 */
const NUM_BANDS = 20

/**
 * Grid band height for all by but the {@link #MAX_BAND_LETTER}
 */
const BAND_HEIGHT = 8.0

/**
 * Grid band height for the {@link #MAX_BAND_LETTER}
 */
const MAX_BAND_HEIGHT = 12.0

/**
 * Get the zone number of the longitude
 *
 * @param longitude longitude in degrees
 * @param eastern true for eastern number on edges, false for western
 * @return zone number
 */
function getZoneNumber (longitude, eastern = true) {
  // Normalize the longitude if needed
  if (longitude < MIN_LON || longitude > MAX_LON) {
    longitude = (longitude - MIN_LON) % (2 * MAX_LON) + MIN_LON
  }

  // Determine the zone
  let zoneValue = (longitude - MIN_LON) / ZONE_WIDTH
  let zoneNumber = 1 + Math.floor(zoneValue)

  // Handle western edge cases and 180.0
  if (!eastern) {
    if (zoneNumber > 1 && zoneValue % 1.0 === 0.0) {
      zoneNumber--
    }
  } else if (zoneNumber > MAX_ZONE_NUMBER) {
    zoneNumber--
  }

  return zoneNumber
}

function getBandLetter (latitude, northern) {
  // Bound the latitude if needed
  if (latitude < MIN_LAT) {
    latitude = MIN_LAT
  } else if (latitude > MAX_LAT) {
    latitude = MAX_LAT
  }

  let bandValue = (latitude - MIN_LAT) / BAND_HEIGHT
  let bands = Math.floor(bandValue)

  // Handle 80.0 to 84.0 and southern edge cases
  if (bands >= NUM_BANDS) {
    bands--
  } else if (!northern && bands > 0 && bandValue % 1.0 === 0.0) {
    bands--
  }

  // Handle skipped 'I' and 'O' letters
  if (bands > 10) {
    bands += 2
  } else if (bands > 5) {
    bands++
  }
  return String.fromCharCode(MIN_BAND_LETTER.charCodeAt(0) + bands)
}

/**
 * Is the zone number and band letter a SVALBARD
 * 
 * @param zoneNumber zone number
 * @param bandLetter band letter
 * @return true if a Svalbard GZD
 */
function isSvalbard (zoneNumber, bandLetter) {
  return isSvalbardLetter(bandLetter) && isSvalbardZone(zoneNumber)
}

/**
 * Is the band letter a Svalbard GZD (X)
 * 
 * @param bandLetter band letter
 * @return true if a Svalbard GZD
 */
function isSvalbardLetter (bandLetter) {
  return bandLetter === SVALBARD_BAND_LETTER
}

/**
 * Is the zone number a Svalbard GZD (31 - 37)
 * @param zoneNumber zone number
 * @return true if a Svalbard GZD
 */
function isSvalbardZone (zoneNumber) {
  return zoneNumber >= MIN_SVALBARD_ZONE_NUMBER && zoneNumber <= MAX_SVALBARD_ZONE_NUMBER
}

/**
 * Get the Svalbard zone number from the longitude
 * 
 * @param longitude longitude
 * @return zone number
 */
function getSvalbardZone (longitude) {
  const minimumLongitude = longitudeGZDZones[MIN_SVALBARD_ZONE_NUMBER][0]
  const zoneValue = MIN_SVALBARD_ZONE_NUMBER + ((longitude - minimumLongitude) / ZONE_WIDTH)
  let zone = Math.round(zoneValue)
  if (zone % 2 === 0) {
    zone--
  }
  return zone
}

/**
 * Is the zone number and band letter a Norway GZD (31V or 32V)
 * 
 * @param zoneNumber zone number
 * @param bandLetter band letter
 * @return true if a Norway GZD
 */
function isNorway (zoneNumber, bandLetter) {
  return isNorwayLetter(bandLetter) && isNorwayZone(zoneNumber)
}

/**
 * Is the band letter a Norway GZD (V)
 * 
 * @param bandLetter band letter
 * @return true if a Norway GZD band letter
 */
function isNorwayLetter (bandLetter) {
  return bandLetter === NORWAY_BAND_LETTER;
}



/**
 * Is the zone number a Norway GZD (31 or 32)
 * @param zoneNumber zone number
 * @return true if a Norway GZD zone number
 */
function isNorwayZone (zoneNumber) {
  return zoneNumber >= MIN_NORWAY_ZONE_NUMBER && zoneNumber <= MAX_NORWAY_ZONE_NUMBER
}


/**
 * Get the Norway zone number from the longitude
 * 
 * @param longitude longitude
 * @return zone number
 */
  function getNorwayZone (longitude) {
    const minimumLongitude = longitudeGZDZones[MIN_NORWAY_ZONE_NUMBER][0]
    let zone = MIN_NORWAY_ZONE_NUMBER
    if (longitude >= minimumLongitude + (ZONE_WIDTH / 2.0)) {
      zone++
    }
    return zone
  }



/**
 * Tests if ranges overlap
 * @param range1
 * @param range2
 * @return {boolean}
 */
function rangesOverlap (range1, range2) {
  const x1 = Math.max(range1[0], range2[0])
  const x2 = Math.min(range1[1], range2[1])
  return x1 <= x2
}

function determineBoundingBoxesInRange (bbox) {
  const bboxes = []
  const minLon = fixLongitude(bbox[0])
  const maxLon = fixLongitude(bbox[2])
  // cross antimeridian and needs to be split
  if (minLon > maxLon) {
    bboxes.push(maxLon, bbox[1], 180.0, bbox[3])
    bboxes.push(-180.0, bbox[1], minLon, bbox[3])
  } else {
    bboxes.push(minLon, bbox[1], maxLon, bbox[3])
  }

  if (bbox[0] < -180 && bbox[1] > 180) {
    bboxes.push(fixLongitude(bbox[0]), bbox[1], 180.0, bbox[3])
    bboxes.push(-180.0, bbox[1], bbox[2], bbox[3])
  } else {
    bboxes.push(bbox)
  }
  return bboxes
}

function isInteresting (zoneLetter, zoneNumber) {
  let interesting = false
  const interestingRanges = interestingZones[zoneLetter]
  if (interestingRanges != null) {
    for (let i = 0; i < interestingRanges.length && !interesting; i++) {
      const range = interestingRanges[i]
      interesting = zoneNumber >= range[0] && zoneNumber <= range[1]
    }
  }
  return interesting
}

/**
 * determine zones within a given bounding box
 * @param bbox
 * @param interestingOnly
 * @return {*[]}
 */
function zonesWithin (bbox, interestingOnly = false) {
  const bboxes = determineBoundingBoxesInRange(bbox)
  let zones = []
  Object.keys(latitudeGZDZones).forEach(latitudeZone => {
    const latRange = latitudeGZDZones[latitudeZone]
    let overlap = false
    for (let i = 0; i < bboxes.length && !overlap; i++) {
      const bbox = bboxes[i]
      if (rangesOverlap(latRange, [bbox[1], bbox[3]])) {
        overlap = true
      }
    }
    if (overlap) {
      Object.keys(longitudeGZDZones).forEach(longitudeZone => {
        const lngRange = longitudeGZDZones[longitudeZone].slice()
        let skip = false
        if (latitudeZone === 'V') {
          if (longitudeZone === '31') {
            lngRange[0] = 0.0
            lngRange[1] = 3.0
          } else if (longitudeZone === '32') {
            lngRange[0] = 3.0
            lngRange[1] = 12.0
          }
        } else if (latitudeZone === 'X') {
          if (longitudeZone === '31') {
            lngRange[0] = 0.0
            lngRange[1] = 9.0
          } else if (longitudeZone === '32') {
            skip = true
          } else if (longitudeZone === '33') {
            lngRange[0] = 9.0
            lngRange[1] = 21.0
          } else if (longitudeZone === '34') {
            skip = true
          } else if (longitudeZone === '35') {
            lngRange[0] = 21.0
            lngRange[1] = 33.0
          } else if (longitudeZone === '36') {
            skip = true
          } else if (longitudeZone === '37') {
            lngRange[0] = 33.0
            lngRange[1] = 42.0
          }
        }

        overlap = false
        for (let i = 0; i < bboxes.length && !overlap; i++) {
          const bbox = bboxes[i]
          if (rangesOverlap(lngRange, [bbox[0], bbox[2]])) {
            overlap = true
          }
        }
        if (!skip && overlap && (!interestingOnly || isInteresting(latitudeZone, longitudeZone))) {
          zones.push(new GridZoneDesignator(latitudeZone, longitudeZone, [lngRange[0], latRange[0], lngRange[1], latRange[1]]))
        }
      })
    }
  })
  return zones
}

export {
  zonesWithin,
  isNorway,
  isNorwayLetter,
  isNorwayZone,
  getNorwayZone,
  isSvalbard,
  isSvalbardLetter,
  isSvalbardZone,
  getSvalbardZone,
  getBandLetter,
  getZoneNumber
}
