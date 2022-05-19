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

    let featureCollections = []

    statusCallback('Parsing shapefile', 0)
    await this.sleep(250)

    if (path.extname(this.filePath) === '.zip') {
      const result = await shp.parseZip(jetpack.read(this.filePath, 'buffer'))
      if (result.length == null) {
        featureCollections.push(result)
      } else {
        featureCollections = result
      }
    } else {
      featureCollections.push({
        type: 'FeatureCollection',
        features: shp.parseShp(jetpack.read(this.filePath, 'buffer')),
        fileName: name
      })
    }

    statusCallback('Storing features', 50)
    const totalFeatures = featureCollections.map(featureCollection => featureCollection.features.length).reduce((previousValue, currentValue) => previousValue + currentValue, 0)
    const notifyStepSize = Math.ceil(totalFeatures / 10)
    const vectorLayers = []
    let featuresAdded = 0

    for (let idx = 0; idx < featureCollections.length; idx++) {
      const featureCollection = featureCollections[idx]
      const features = featureCollection.features
      const layerName = featureCollection.fileName || name

      const { layerId, layerDirectory } = this.createLayerDirectory()
      let fileName = layerName + '.gpkg'
      let filePath = path.join(layerDirectory, fileName)

      const { addFeature, done } = await streamingGeoPackageBuild(filePath, layerName)

      for (let i = 0; i < features.length; i++) {
        const feature = features[i]
        delete features[i].geometry.bbox
        addFeature(feature)
        featuresAdded++
        if ((featuresAdded % notifyStepSize) === 0) {
          statusCallback('Storing features', 50 + Math.floor(50 * featuresAdded / totalFeatures))
          await this.sleep(150)
        }
      }

      const { count, extent } = await done()

      vectorLayers.push(new VectorLayer({
        id: layerId,
        layerType: VECTOR,
        directory: layerDirectory,
        sourceDirectory: this.directory,
        name: layerName,
        geopackageFilePath: filePath,
        sourceFilePath: this.filePath,
        sourceLayerName: layerName,
        sourceType: 'ShapeFile',
        count: count,
        extent: extent
      }))
    }

    statusCallback('Cleaning up', 100)
    await this.sleep(250)
    return vectorLayers
  }
}
