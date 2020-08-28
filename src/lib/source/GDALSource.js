import Source from './Source'
import gdal from 'gdal'
import GeoTiffLayer from './layer/tile/GeoTiffLayer'
import path from 'path'
import GeoPackageUtilities from '../GeoPackageUtilities'
import VectorLayer from './layer/vector/VectorLayer'

export default class GDALSource extends Source {
  constructor (filePath, sourceId) {
    super(filePath, sourceId)
    // verify this can be opened
    gdal.config.set('OGR_ENABLE_PARTIAL_REPROJECTION', 'YES')
    this.dataset = gdal.open(this.filePath, 'r')
    this.dataset.close()
  }

  async retrieveLayers () {
    gdal.config.set('OGR_ENABLE_PARTIAL_REPROJECTION', 'YES')
    this.dataset = gdal.open(this.filePath, 'r') //, 'KMLSUPEROVERLAY')
    this.layers = []
    for (let i = 0; i < this.dataset.layers.count(); i++) {
      let layer = this.dataset.layers.get(i)
      let name
      if (layer.name.startsWith('OGR')) {
        name = path.basename(this.filePath, path.extname(this.filePath))
      } else {
        name = layer.name
      }
      let wgs84 = gdal.SpatialReference.fromEPSG(4326)
      let toNative = new gdal.CoordinateTransformation(layer.srs, wgs84)
      let features = layer.features.map((feature) => {
        try {
          let geom = feature.getGeometry().clone()
          if (!layer.srs.isSame(wgs84)) {
            geom.transform(toNative)
          }
          return {
            type: 'Feature',
            id: feature.fid,
            properties: feature.fields.toObject(),
            geometry: geom.toObject()
          }
        } catch (e) {
          console.error(e)
        }
      }).filter(feature => feature !== undefined)
      let featureCollection = {
        type: 'FeatureCollection',
        features: features
      }

      let fileName = name + '.gpkg'
      let filePath = this.sourceCacheFolder.file(fileName).path()
      let fullFile = path.join(filePath, fileName)
      await GeoPackageUtilities.buildGeoPackage(fullFile, name, featureCollection)
      this.layers.push(new VectorLayer({
        id: this.sourceId,
        geopackageFilePath: fullFile,
        sourceFilePath: this.filePath,
        sourceLayerName: name,
        sourceType: 'GDAL',
        tablePointIconRowId: await GeoPackageUtilities.getTableIconId(fullFile, name, 'Point')
      }))
    }
    if (this.dataset.driver.description === 'GTiff') {
      this.layers.push(new GeoTiffLayer({filePath: this.filePath, shown: true}))
    }
    this.dataset.close()
    return this.layers
  }
}
