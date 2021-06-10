const VECTOR = 'Vector'
const GEOPACKAGE = 'GeoPackage'
const GEOTIFF = 'GeoTIFF'
const WMS = 'WMS'
const XYZ_FILE = 'XYZFile'
const XYZ_SERVER = 'XYZServer'
const MBTILES = 'MBTiles'

function isRemote (source) {
  return source.layerType === WMS || source.layerType === XYZ_SERVER
}

export {
  VECTOR,
  GEOPACKAGE,
  GEOTIFF,
  WMS,
  XYZ_FILE,
  XYZ_SERVER,
  MBTILES,
  isRemote
}
