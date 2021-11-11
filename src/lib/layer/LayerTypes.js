const VECTOR = 'Vector'
const GEOPACKAGE = 'GeoPackage'
const GEOTIFF = 'GeoTIFF'
const WMS = 'WMS'
const WMTS = 'WMTS'
const XYZ_FILE = 'XYZFile'
const XYZ_SERVER = 'XYZServer'
const MBTILES = 'MBTiles'

function isRemote (source) {
  return source.layerType === WMS || source.layerType === XYZ_SERVER || source.layerType === WMTS
}

export {
  VECTOR,
  GEOPACKAGE,
  GEOTIFF,
  WMS,
  WMTS,
  XYZ_FILE,
  XYZ_SERVER,
  MBTILES,
  isRemote
}
