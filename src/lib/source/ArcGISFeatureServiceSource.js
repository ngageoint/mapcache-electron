import Source from './Source'
import path from 'path'
import VectorLayer from '../layer/vector/VectorLayer'
import { getFeatureCollectionForLayer, getGeoPackageColumnsForLayer } from '../util/ArcGISFeatureServiceUtilities'
import { getGeoPackageExtent } from '../geopackage/GeoPackageCommon'
import { buildGeoPackage } from '../geopackage/GeoPackageFeatureTableUtilities'
import { VECTOR } from '../layer/LayerTypes'

export default class ArcGISFeatureServiceSource extends Source {
  constructor (id, directory, filePath, layers = [], sourceName, layerDatum) {
    super (id, directory, filePath)
    this.layers = layers
    this.sourceName = sourceName
    this.layerDatum = layerDatum
  }

  async retrieveLayers () {
    let featureCollection = {
      type: 'FeatureCollection',
      features: []
    }
    let fields = []
    for (const layer of this.layers) {
      const layerData = this.layerDatum[layer.id]
      featureCollection.features = featureCollection.features.concat(getFeatureCollectionForLayer(layerData).features)
      // only add new fields
      fields = fields.concat(getGeoPackageColumnsForLayer(layerData).filter(f => fields.findIndex(field => field.name.toLowerCase() === f.name.toLowerCase()) === -1))
    }
    const { layerId, layerDirectory } = this.createLayerDirectory()
    let fileName = this.sourceName + '.gpkg'
    let filePath = path.join(layerDirectory, fileName)
    await buildGeoPackage(filePath, this.sourceName, featureCollection, null, fields)
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
        sourceType: 'ArcGIS FS',
        count: featureCollection.features.length,
        extent: extent
      })
    ]
  }
}
