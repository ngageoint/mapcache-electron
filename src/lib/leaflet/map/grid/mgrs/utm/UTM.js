import {
  getBandLetter,
  getNorwayZone,
  getSvalbardZone, getZoneNumber,
  isNorwayLetter,
  isNorwayZone,
  isSvalbardLetter,
  isSvalbardZone
} from '../gzd/GZDZones'

class UTM {
  zoneNumber
  hemisphere
  easting
  northing

  constructor (zoneNumber, hemisphere, easting, northing) {
    this.zoneNumber = zoneNumber;
    this.hemisphere = hemisphere;
    this.easting = easting;
    this.northing = northing;
  }

  static HEMISPHERE = {
    NORTH: 'NORTH',
    SOUTH: 'SOUTH'
  }

  getZoneNumber () {
    return this.zoneNumber
  }

  getHemisphere () {
    return this.hemisphere
  }

  getEasting () {
    return this.easting
  }

  getNorthing () {
    return this.northing
  }

  static getZoneNumber(latLng) {
    let zone = getZoneNumber(latLng.longitude)
    const svalbardZone = isSvalbardZone(zone)
    const norwayZone = isNorwayZone(zone)

    if (svalbardZone || norwayZone) {
      const bandLetter = getBandLetter(latLng.latitude, latLng.latitude >= 0)
      if (svalbardZone && isSvalbardLetter(bandLetter)) {
        zone = getSvalbardZone(latLng.longitude)
      } else if (norwayZone && isNorwayLetter(bandLetter)) {
        zone = getNorwayZone(latLng.longitude)
      }
    }
    return zone
  }

  static from (latLng, zone, hemisphere) {
    if (zone == null) {
      zone = UTM.getZoneNumber(latLng)
    }

    if (hemisphere == null) {
      hemisphere = latLng.latitude >= 0 ? UTM.HEMISPHERE.NORTH : UTM.HEMISPHERE.SOUTH
    }
    const latitude = latLng.latitude
    const longitude = latLng.longitude

    let easting = 0.5 * Math.log((1 + Math.cos(latitude * Math.PI / 180) * Math.sin(longitude * Math.PI / 180 - (6 * zone - 183) * Math.PI / 180)) / (1 - Math.cos(latitude * Math.PI / 180) * Math.sin(longitude * Math.PI / 180 - (6 * zone - 183) * Math.PI / 180))) * 0.9996 * 6399593.62 / Math.pow((1 + Math.pow(0.0820944379, 2) * Math.pow(Math.cos(latitude * Math.PI / 180), 2)), 0.5) * (1 + Math.pow(0.0820944379, 2) / 2 * Math.pow((0.5 * Math.log((1 + Math.cos(latitude * Math.PI / 180) * Math.sin(longitude * Math.PI / 180 - (6 * zone - 183) * Math.PI / 180)) / (1 - Math.cos(latitude * Math.PI / 180) * Math.sin(longitude * Math.PI / 180 - (6 * zone - 183) * Math.PI / 180)))), 2) * Math.pow(Math.cos(latitude * Math.PI / 180), 2) / 3) + 500000
    easting = Math.round(easting * 100) * 0.01
    let northing = (Math.atan(Math.tan(latitude * Math.PI / 180) / Math.cos((longitude * Math.PI / 180 - (6 * zone - 183) * Math.PI / 180))) - latitude * Math.PI / 180) * 0.9996 * 6399593.625 / Math.sqrt(1 + 0.006739496742 * Math.pow(Math.cos(latitude * Math.PI / 180), 2)) * (1 + 0.006739496742 / 2 * Math.pow(0.5 * Math.log((1 + Math.cos(latitude * Math.PI / 180) * Math.sin((longitude * Math.PI / 180 - (6 * zone - 183) * Math.PI / 180))) / (1 - Math.cos(latitude * Math.PI / 180) * Math.sin((longitude * Math.PI / 180 - (6 * zone - 183) * Math.PI / 180)))), 2) * Math.pow(Math.cos(latitude * Math.PI / 180), 2)) + 0.9996 * 6399593.625 * (latitude * Math.PI / 180 - 0.005054622556 * (latitude * Math.PI / 180 + Math.sin(2 * latitude * Math.PI / 180) / 2) + 4.258201531e-05 * (3 * (latitude * Math.PI / 180 + Math.sin(2 * latitude * Math.PI / 180) / 2) + Math.sin(2 * latitude * Math.PI / 180) * Math.pow(Math.cos(latitude * Math.PI / 180), 2)) / 4 - 1.674057895e-07 * (5 * (3 * (latitude * Math.PI / 180 + Math.sin(2 * latitude * Math.PI / 180) / 2) + Math.sin(2 * latitude * Math.PI / 180) * Math.pow(Math.cos(latitude * Math.PI / 180), 2)) / 4 + Math.sin(2 * latitude * Math.PI / 180) * Math.pow(Math.cos(latitude * Math.PI / 180), 2) * Math.pow(Math.cos(latitude * Math.PI / 180), 2)) / 3)

    if (hemisphere === UTM.HEMISPHERE.SOUTH) {
      northing = northing + 10000000
    }

    northing = Math.round(northing * 100) * 0.01

    return new UTM(zone, hemisphere, easting, northing)
  }
}

export {
  UTM
}
