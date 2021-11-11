const Units = {
  DEGREES: 'degrees',
  FEET: 'ft',
  METERS: 'm',
  PIXELS: 'pixels',
  TILE_PIXELS: 'tile-pixels',
  USFEET: 'us-ft',
}


const METERS_PER_UNIT = {}
METERS_PER_UNIT[Units.DEGREES] = (2 * Math.PI * 6378137.0) / 360.0
METERS_PER_UNIT[Units.FEET] = 0.3048
METERS_PER_UNIT[Units.METERS] = 1
METERS_PER_UNIT[Units.USFEET] = 1200 / 3937


export {
  Units,
  METERS_PER_UNIT
}
