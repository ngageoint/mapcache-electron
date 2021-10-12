import Source from '../Source'
import path from 'path'
import shp from 'shpjs'
import jetpack from 'fs-jetpack'
import VectorLayer from '../../layer/vector/VectorLayer'
import { VECTOR } from '../../layer/LayerTypes'
import { streamingGeoPackageBuild } from '../../geopackage/GeoPackageFeatureTableUtilities'

export default class ShapeFileSource extends Source {
  async retrieveLayers (statusCallback) {
    const name = path.basename(this.filePath, path.extname(this.filePath))
    if (!await jetpack.existsAsync(this.filePath)) {
      throw new Error('.shp file not found in zip file\'s root directory.')
    }
    let featureCollection = {
      type: 'FeatureCollection',
      features: []
    }

    statusCallback('Parsing shapefile', 0)
    await this.sleep(250)

    if (path.extname(this.filePath) === '.zip') {
      featureCollection = shp.parseZip(jetpack.read(this.filePath, 'buffer'))
    } else {
      featureCollection.features = shp.parseShp(jetpack.read(this.filePath, 'buffer'))
    }

    statusCallback('Storing features', 50)

    const { layerId, layerDirectory } = this.createLayerDirectory()
    let fileName = name + '.gpkg'
    let filePath = path.join(layerDirectory, fileName)

    const {addFeature, done} = await streamingGeoPackageBuild(filePath, name)

    const notifyStepSize = Math.ceil(featureCollection.features.length / 10)
    for (let i = 0; i < featureCollection.features.length; i++) {
      addFeature(featureCollection.features[i])
      if (((i + 1) % notifyStepSize) === 0) {
        statusCallback('Storing features', 50 + Math.floor(50 * ((i + 1) / featureCollection.features.length)))
        await this.sleep(150)
      }
    }

    const {count, extent} = await done()
    statusCallback('Cleaning up', 100)
    await this.sleep(250)
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
        count: count,
        extent: extent
      })
    ]
  }
}
