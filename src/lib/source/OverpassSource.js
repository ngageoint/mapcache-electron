import Source from './Source'
import path from 'path'
import VectorLayer from '../layer/vector/VectorLayer'
import { buildGeoPackage } from '../geopackage/GeoPackageFeatureTableUtilities'
import { getGeoPackageExtent } from '../geopackage/GeoPackageCommon'
import { getOverpassDefaultStyle } from '../util/style/NodeStyleUtilities'
import { VECTOR } from '../layer/LayerTypes'

export default class OverpassSource extends Source {
  constructor (id, directory, filePath, sourceName, featureCollection) {
    super(id, directory, filePath)
    this.sourceName = sourceName
    this.featureCollection = featureCollection
  }

  async retrieveLayers () {
    const { layerId, layerDirectory } = this.createLayerDirectory()
    let fileName = this.sourceName + '.gpkg'
    let filePath = path.join(layerDirectory, fileName)
    const featureCollection = this.featureCollection
    const style = getOverpassDefaultStyle(featureCollection)
    await buildGeoPackage(filePath, this.sourceName, featureCollection, style).catch(err => {
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
        sourceType: 'Overpass',
        count: featureCollection.features.length,
        extent: extent
      })
    ]
  }
}
