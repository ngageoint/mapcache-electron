import Source from './Source'
import gdal from 'gdal-next'
import fs from 'fs'
import GeoTiffLayer from './layer/tile/GeoTiffLayer'
import path from 'path'
import GeoPackageUtilities from '../GeoPackageUtilities'
import VectorLayer from './layer/vector/VectorLayer'
import FileUtilities from '../FileUtilities'

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
    if (this.dataset.driver.description === 'GTiff') {
      const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
      let filePath = path.join(sourceDirectory, path.basename(this.filePath))
      fs.copyFileSync(this.filePath, filePath)
      this.layers.push(new GeoTiffLayer({filePath: filePath, sourceDirectory, sourceId}))
      this.dataset.close()
    } else {
      for (let i = 0; i < this.dataset.layers.count(); i++) {
        let layer = this.dataset.layers.get(i)
        let name
        if (layer.name.startsWith('OGR')) {
          name = path.basename(this.filePath, path.extname(this.filePath))
        } else {
          name = layer.name
        }
        let wgs84 = gdal.SpatialReference.fromProj4('+init=epsg:4326')
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

        const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
        const fileName = name + '.gpkg'
        const filePath = path.join(sourceDirectory, fileName)
        const ext = path.extname(this.filePath).toLowerCase()

        let sourceType = 'GDAL'
        if (ext === '.geojson' || ext === '.json') {
          sourceType = 'GeoJSON'
        }
        await GeoPackageUtilities.buildGeoPackage(filePath, name, featureCollection)
        this.layers.push(new VectorLayer({
          id: this.sourceId,
          geopackageFilePath: filePath,
          sourceDirectory: sourceDirectory,
          sourceId: sourceId,
          sourceLayerName: name,
          sourceType
        }))
      }
      this.dataset.close()
    }

    return this.layers
  }
}
