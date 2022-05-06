import Source from '../Source'
import path from 'path'
import VectorLayer from '../../layer/vector/VectorLayer'
import { streamingGeoPackageBuild } from '../../geopackage/GeoPackageFeatureTableUtilities'
import { VECTOR } from '../../layer/LayerTypes'
import { readJSONFile, rmFile } from '../../util/file/FileUtilities'
import {
  getGeoPackageColumnsForLayer,
  getFeatureCollectionForLayer
} from '../../util/arcgis/ArcGISFeatureServiceUtilities'

export default class ArcGISFeatureServiceSource extends Source {
  constructor (id, directory, filePath, layers = [], sourceName, layerDatum) {
    super(id, directory, filePath)
    this.layers = layers
    this.sourceName = sourceName
    this.layerDatum = layerDatum
  }

  async retrieveLayers (statusCallback) {
    statusCallback('Processing ArcGIS FS layers', 25)
    await this.sleep(250)

    const { layerId, layerDirectory } = this.createLayerDirectory()
    let fileName = this.sourceName + '.gpkg'
    let filePath = path.join(layerDirectory, fileName)

    const { addFeature, addField, done } = await streamingGeoPackageBuild(filePath, this.sourceName)
    const fileCompleteStatusStepSize = 75 / this.layers.length
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i]
      const filePath = layer.filePath
      if (filePath) {
        const layerData = readJSONFile(filePath)
        rmFile(filePath)
        const fields = getGeoPackageColumnsForLayer(layerData)
        for (let j = 0; j < fields.length; j++) {
          const field = fields[j]
          addField(field)
        }

        const features = getFeatureCollectionForLayer(layerData).features
        const notifyStepSize = Math.ceil(features.length / 5)
        for (let j = 0; j < features.length; j++) {
          addFeature(features[j])
          if (((j + 1) % notifyStepSize) === 0) {
            statusCallback('Parsing and storing features', 25 + Math.floor(i * fileCompleteStatusStepSize + (fileCompleteStatusStepSize * ((j + 1) / features.length))))
          }
        }
        statusCallback('Parsing and storing features', 25 + Math.floor((i + 1) * fileCompleteStatusStepSize))
      }
    }
    const { extent, count } = await done()
    statusCallback('Cleaning up', 100)
    await this.sleep(250)

    return [
      new VectorLayer({
        id: layerId,
        layerType: VECTOR,
        directory: layerDirectory,
        sourceDirectory: this.directory,
        name: this.sourceName,
        geopackageFilePath: filePath,
        sourceFilePath: this.filePath,
        sourceLayerName: this.sourceName,
        sourceType: 'ArcGIS FS',
        count: count,
        extent: extent
      })
    ]
  }
}
