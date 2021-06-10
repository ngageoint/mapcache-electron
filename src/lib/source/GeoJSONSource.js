import path from 'path'
import jetpack from 'fs-jetpack'
import isNil from 'lodash/isNil'
import Source from './Source'
import VectorLayer from '../layer/vector/VectorLayer'
import { getGeoPackageExtent } from '../geopackage/GeoPackageCommon'
import { buildGeoPackage } from '../geopackage/GeoPackageFeatureTableUtilities'
import { VECTOR } from '../layer/LayerTypes'

export default class GeoJSONSource extends Source {
  async retrieveLayers () {
    let featureCollection = {
      type: 'FeatureCollection',
      features: []
    }

    const data = jetpack.read(this.filePath, 'json')
    if (!isNil(data) && data.type === 'FeatureCollection') {
      featureCollection = data
    } else if (!isNil(data) && data.type === 'Feature') {
      featureCollection.features.push(data)
    }

    const { layerId, layerDirectory } = this.createLayerDirectory()
    const name = path.basename(this.filePath, path.extname(this.filePath))
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
        sourceType: 'GeoJSON',
        count: featureCollection.features.length,
        extent: extent
      })
    ]
  }
}
