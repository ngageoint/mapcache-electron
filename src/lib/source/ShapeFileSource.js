import Source from './Source'
import path from 'path'
import shp from 'shpjs'
import jetpack from 'fs-jetpack'
import VectorLayer from '../layer/vector/VectorLayer'
import { getGeoPackageExtent } from '../geopackage/GeoPackageCommon'
import { buildGeoPackage } from '../geopackage/GeoPackageFeatureTableUtilities'
import { VECTOR } from '../layer/LayerTypes'

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

    // it is a zip
    if (path.extname(this.filePath) === '.zip') {
      featureCollection = shp.parseZip(jetpack.read(this.filePath, 'buffer'))
    } else {
      featureCollection.features = shp.parseShp(jetpack.read(this.filePath, 'buffer'))
    }
    const { layerId, layerDirectory } = this.createLayerDirectory()
    let fileName = name + '.gpkg'
    let filePath = path.join(layerDirectory, fileName)
    await buildGeoPackage(filePath, name, featureCollection)
    const extent = await getGeoPackageExtent(filePath, name)
    return [
      new VectorLayer({
        id: layerId,
        layerType: VECTOR,
        directory: layerDirectory,
        sourceDirectory: this.directory,
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
