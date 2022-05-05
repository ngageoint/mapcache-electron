const VECTOR = 'Vector'
const GEOPACKAGE = 'GeoPackage'
const GEOTIFF = 'GeoTIFF'
const WMS = 'WMS'
const WFS = 'WFS'
const WMTS = 'WMTS'
const XYZ_FILE = 'XYZFile'
const XYZ_SERVER = 'XYZServer'
const MBTILES = 'MBTiles'
const ARCGIS_FS = 'ArcGIS FS'
const GEOJSON = 'GeoJSON'
const SHAPEFILE = 'ShapeFile'
const KML = 'KML'
const OVERPASS = 'Overpass'

function isRemote (source) {
  return source.layerType === WMS || source.layerType === XYZ_SERVER || source.layerType === WMTS
}

function getDisplayText (type) {
  let displayText = null
  switch (type) {
    case VECTOR:
      displayText = 'Vector'
      break
    case GEOTIFF:
      displayText = 'GeoTIFF'
      break
    case GEOPACKAGE:
      displayText = 'GeoPackage'
      break
    case WMS:
      displayText = 'WMS'
      break
    case WMTS:
      displayText = 'WMTS'
      break
    case XYZ_FILE:
      displayText = 'XYZ File'
      break
    case XYZ_SERVER:
      displayText = 'XYZ Tile Server'
      break
    case MBTILES:
      displayText = 'Mapbox Tiles'
      break
    case ARCGIS_FS:
      displayText = 'ArcGIS FS'
      break
    case GEOJSON:
      displayText = 'GeoJSON'
      break
    case SHAPEFILE:
      displayText = 'Shapefile'
      break
    case KML:
      displayText = 'KML'
      break
    case OVERPASS:
      displayText = 'Overpass'
      break
    case WFS:
      displayText = 'WFS'
      break
  }
  return displayText
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
  ARCGIS_FS,
  GEOJSON,
  SHAPEFILE,
  KML,
  OVERPASS,
  WFS,
  isRemote,
  getDisplayText
}
