import Source from './Source'
import path from 'path'
import GeoPackageUtilities from '../GeoPackageUtilities'
import VectorLayer from './layer/vector/VectorLayer'
import FileUtilities from '../FileUtilities'
import jetpack from 'fs-jetpack'
import _ from 'lodash'

export default class GeoJSONSource extends Source {
  async retrieveLayers () {
    const geopackageLayers = []
    let featureCollection = {
      type: 'FeatureCollection',
      features: []
    }

    const data = jetpack.read(this.filePath, 'json')
    if (!_.isNil(data) && data.type === 'FeatureCollection') {
      featureCollection = data
    } else if (!_.isNil(data) && data.type === 'Feature') {
      featureCollection.features.push(data)
    }

    const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
    const name = path.basename(this.filePath, path.extname(this.filePath))
    let fileName = name + '.gpkg'
    let filePath = path.join(sourceDirectory, fileName)
    console.log(filePath)
    console.log(name)
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
      sourceType: 'GeoJSON',
      extent: extent
    }))
    return geopackageLayers
  }
}
