export default class LayerTypes {
  static VECTOR = 'Vector'
  static GEOPACKAGE = 'GeoPackage'
  static GEOTIFF = 'GeoTIFF'
  static WMS = 'WMS'
  static XYZ_FILE = 'XYZFile'
  static XYZ_SERVER = 'XYZServer'
  static MBTILES = 'MBTiles'

  static isRemote (source) {
    return source.layerType === LayerTypes.WMS || source.layerType === LayerTypes.XYZ_SERVER
  }
}
