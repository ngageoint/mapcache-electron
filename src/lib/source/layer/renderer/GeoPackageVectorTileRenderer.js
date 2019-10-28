import FeatureTiles from '@ngageoint/geopackage/lib/tiles/features/index'
import NumberFeaturesTile from '@ngageoint/geopackage/lib/tiles/features/custom/numberFeaturesTile'

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
    this.featureTile.setMaxFeaturesTileDraw(new NumberFeaturesTile())
    this.featureTile.setMaxFeaturesPerTile(this.maxFeatures)
  }

  async styleChanged (geopackage, maxFeatures) {
    this.geopackage = geopackage
    this.maxFeatures = maxFeatures
    await this.init()
  }
  async renderVectorTile (coords, tileCanvas, done) {
    let {x, y, z} = coords
    if (tileCanvas) {
      let imgSrc = await this.featureTile.drawTile(x, y, z)
      let image = new Image()
      image.onload = function () {
        tileCanvas.getContext('2d').drawImage(image, 0, 0)
        if (done) {
          done(null, tileCanvas)
        }
        return tileCanvas
      }
      image.src = imgSrc
    } else {
      let image = await this.featureTile.drawTile(x, y, z)
      if (done) {
        done(null, image)
      }
      return image
    }
  }
}
