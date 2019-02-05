import Source from './Source'
import GeoPackage from '@ngageoint/geopackage'
import GeoPackageLayer from './layer/GeoPackageLayer'

export default class GeoPackageSource extends Source {
  async retrieveLayers () {
    this.geopackage = await GeoPackage.open(this.filePath)

    this.layers = []
    let tileLayers = this.geopackage.getTileTables()
    for (const layer of tileLayers) {
      this.layers.push(new GeoPackageLayer({
        filePath: this.filePath,
        sourceLayerName: layer,
        pane: 'tile'
      }))
    }
    let featureLayers = this.geopackage.getFeatureTables()
    for (const layer of featureLayers) {
      this.layers.push(new GeoPackageLayer({
        filePath: this.filePath,
        sourceLayerName: layer,
        pane: 'vector'
      }))
    }

    return this.layers
  }
}
