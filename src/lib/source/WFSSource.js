import Source from './Source'
import path from 'path'
import VectorLayer from '../layer/vector/VectorLayer'
import { buildGeoPackage } from '../geopackage/GeoPackageFeatureTableUtilities'
import { getGeoPackageExtent } from '../geopackage/GeoPackageCommon'
import { VECTOR } from '../layer/LayerTypes'
import { convertWFSToGeoJSON } from '../util/OpenLayersUtilities'

export default class WFSSource extends Source {
  constructor (id, directory, filePath, layers = [], sourceName, layerDatum) {
    super(id, directory, filePath)
    this.layers = layers
    this.sourceName = sourceName
    this.layerDatum = layerDatum
  }

  /**
   * Converts data to features
   * @param layers
   * @returns {{features: *[], type: string}}
   */
  getWFSFeatureCollection (layers) {
    let featureCollection = {
      type: 'FeatureCollection',
      features: []
    }
    for (let layer of layers) {
      featureCollection.features = featureCollection.features.concat(convertWFSToGeoJSON(layer, this.layerDatum[layer.id]))
    }
    return featureCollection
  }

  async retrieveLayers () {
    const { layerId, layerDirectory } = this.createLayerDirectory()
    let fileName = this.sourceName + '.gpkg'
    let filePath = path.join(layerDirectory, fileName)

    const featureCollection = this.getWFSFeatureCollection(this.layers)

    await buildGeoPackage(filePath, this.sourceName, featureCollection).catch(err => {
      throw err
    })
    const extent = await getGeoPackageExtent(filePath, this.sourceName)
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
        sourceType: 'WFS',
        count: featureCollection.features.length,
        extent: extent
      })
    ]
  }
}
