import Source from './Source'
import { GeoPackageAPI, GeometryType } from '@ngageoint/geopackage'
import GeoPackageLayer from './layer/tile/GeoPackageLayer'
import VectorLayer from './layer/vector/VectorLayer'
import GeoPackageUtilities from '../GeoPackageUtilities'
import path from 'path'
import UniqueIDUtilities from '../UniqueIDUtilities'

export default class GeoPackageSource extends Source {
  async retrieveLayers () {
    this.geopackage = await GeoPackageAPI.open(this.filePath)

    this.layers = []
    let tileLayers = this.geopackage.getTileTables()
    for (const layer of tileLayers) {
      try {
        let tileLayer = new GeoPackageLayer({
          filePath: this.filePath,
          sourceLayerName: layer,
          pane: 'tile',
          shown: true
        })
        this.layers.push(tileLayer)
      } catch (error) {
        console.error('Unable to import tile table: ' + layer)
        console.error(error)
      }
    }
    let featureLayers = this.geopackage.getFeatureTables()
    for (const layer of featureLayers) {
      let fileName = layer + '.gpkg'
      let filePath = this.sourceCacheFolder.file(fileName).path()
      let fullFile = path.join(filePath, fileName)
      try {
        await GeoPackageUtilities.copyGeoPackageFeatureLayerAndStyles(this.filePath, fullFile, layer)
        this.layers.push(new VectorLayer({
          id: UniqueIDUtilities.createUniqueID(),
          geopackageFilePath: fullFile,
          sourceFilePath: this.filePath,
          sourceLayerName: layer,
          sourceType: 'GeoPackage',
          tablePointIconRowId: await GeoPackageUtilities.getTableIconId(fullFile, layer, GeometryType.POINT)
        }))
      } catch (error) {
        console.error('Unable to import feature table: ' + layer)
        console.error(error)
      }
    }

    return this.layers
  }
}
