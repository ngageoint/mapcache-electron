import Source from './Source'
import GeoPackage from '@ngageoint/geopackage'
import GeoPackageLayer from './layer/tile/GeoPackageLayer'
import VectorLayer from './layer/vector/VectorLayer'
import GeoPackageUtilities from '../GeoPackageUtilities'
import path from 'path'

export default class GeoPackageSource extends Source {
  async retrieveLayers () {
    this.geopackage = await GeoPackage.open(this.filePath)

    this.layers = []
    let tileLayers = this.geopackage.getTileTables()
    for (const layer of tileLayers) {
      this.layers.push(new GeoPackageLayer({
        filePath: this.filePath,
        sourceLayerName: layer,
        pane: 'tile',
        shown: true
      }))
    }
    let featureLayers = this.geopackage.getFeatureTables()
    for (const layer of featureLayers) {
      let fileName = layer + '.gpkg'
      let filePath = this.sourceCacheFolder.file(fileName).path()
      let fullFile = path.join(filePath, fileName)
      let gp = await GeoPackageUtilities.copyGeoPackageFeatureLayerAndStyles(this.filePath, fullFile, layer)
      this.layers.push(new VectorLayer({
        id: this.sourceId,
        geopackageFilePath: fullFile,
        sourceFilePath: this.filePath,
        sourceLayerName: layer,
        sourceType: 'GeoPackage',
        tablePointIconRowId: GeoPackageUtilities.getTableIconId(gp, layer, 'Point')
      }))
    }

    return this.layers
  }
}
