import Source from './Source'
import path from 'path'
import shp from 'shpjs'
import jetpack from 'fs-jetpack'
import VectorLayer from './layer/vector/VectorLayer'
import GeoPackageCommon from '../geopackage/GeoPackageCommon'
import GeoPackageFeatureTableUtilities from '../geopackage/GeoPackageFeatureTableUtilities'

export default class ShapeFileSource extends Source {
  async retrieveLayers () {
    const name = path.basename(this.filePath, path.extname(this.filePath))
    if (!await jetpack.existsAsync(this.filePath)) {
      throw new Error('.shp file not found in zip file\'s root directory.')
    }
    let featureCollection = {
      type: 'FeatureCollection',
      features: []
    }
    const dbfFile = path.join(path.dirname(this.filePath), name + '.dbf')
    const dbfExists = jetpack.exists(dbfFile)
    if (dbfExists) {
      featureCollection = shp.combine([shp.parseShp(jetpack.read(this.filePath, 'buffer')), shp.parseDbf(jetpack.read(dbfFile, 'buffer'))])
    } else {
      featureCollection.features = shp.parseShp(jetpack.read(this.filePath, 'buffer'))
    }
    const { layerId, layerDirectory } = this.createLayerDirectory()
    let fileName = name + '.gpkg'
    let filePath = path.join(layerDirectory, fileName)
    await GeoPackageFeatureTableUtilities.buildGeoPackage(filePath, name, featureCollection)
    const extent = await GeoPackageCommon.getGeoPackageExtent(filePath, name)
    return [
      new VectorLayer({
        id: layerId,
        sourceDirectory: layerDirectory,
        name: name,
        geopackageFilePath: filePath,
        sourceFilePath: this.filePath,
        sourceLayerName: name,
        sourceType: 'ShapeFile',
        count: featureCollection.features.length,
        extent: extent
      })
    ]
  }
}
