import { FeatureTiles, NumberFeaturesTile } from '@ngageoint/geopackage'

export default class GeoPackageVectorTileRenderer {
  geopackage
  featureTableName
  featureDao
  featureTile
  maxFeatures

  constructor (geopackage, featureTableName, maxFeatures) {
    this.geopackage = geopackage
    this.featureTableName = featureTableName
    this.maxFeatures = maxFeatures
  }

  async init () {
    this.featureDao = this.geopackage.getFeatureDao(this.featureTableName)
    this.featureTile = new FeatureTiles(this.featureDao, 256, 256)
    this.featureTile.maxFeaturesTileDraw = new NumberFeaturesTile()
    this.featureTile.maxFeaturesPerTile = this.maxFeatures
    this.featureTile.iconCacheSize = 1000
  }

  async styleChanged (geopackage, maxFeatures) {
    this.geopackage = geopackage
    this.maxFeatures = maxFeatures
    await this.init()
  }
  async renderVectorTile (coords, tileCanvas, done) {
    // console.time(JSON.stringify(coords))
    let {x, y, z} = coords
    if (tileCanvas) {
      this.featureTile.drawTile(x, y, z, tileCanvas).then(() => {
        // console.timeEnd(JSON.stringify(coords))
        if (done) {
          done(null, tileCanvas)
        }
      })
    } else {
      let image = await this.featureTile.drawTile(x, y, z)
      if (done) {
        done(null, image)
      }
      return image
    }
  }
}
