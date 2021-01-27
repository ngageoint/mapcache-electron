import Source from './Source'
import path from 'path'
import GeoPackageUtilities from '../GeoPackageUtilities'
import VectorLayer from './layer/vector/VectorLayer'
import FileUtilities from '../FileUtilities'
import shp from 'shpjs'
import jetpack from 'fs-jetpack'

export default class ShapeFileSource extends Source {
  async retrieveLayers () {
    const geopackageLayers = []
    let featureCollection = {
      type: 'FeatureCollection',
      features: []
    }
    const name = path.basename(this.filePath, path.extname(this.filePath))
    if (await jetpack.existsAsync(this.filePath)) {
      const dbfFile = path.join(path.dirname(this.filePath), name + '.dbf')
      const dbfExists = jetpack.exists(dbfFile)
      if (dbfExists) {
        featureCollection = shp.combine([shp.parseShp(jetpack.read(this.filePath, 'buffer')), shp.parseDbf(jetpack.read(dbfFile, 'buffer'))])
      } else {
        featureCollection.features = shp.parseShp(jetpack.read(this.filePath, 'buffer'))
      }
      const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
      let fileName = name + '.gpkg'
      let filePath = path.join(sourceDirectory, fileName)
      await GeoPackageUtilities.buildGeoPackage(filePath, name, featureCollection)
      const extent = GeoPackageUtilities.getGeoPackageExtent(filePath, name)
      geopackageLayers.push(new VectorLayer({
        id: sourceId,
        name: name,
        geopackageFilePath: filePath,
        sourceFilePath: this.filePath,
        sourceDirectory: sourceDirectory,
        sourceId: sourceId,
        sourceLayerName: name,
        sourceType: 'ShapeFile',
        extent: extent
      }))
    } else {
      throw new Error('.shp file not found in zip file\'s root directory.')
    }
    return geopackageLayers
  }
}
