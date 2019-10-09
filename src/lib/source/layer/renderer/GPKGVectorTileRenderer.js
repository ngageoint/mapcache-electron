import FeatureTiles from '@ngageoint/geopackage/lib/tiles/features/index'
import NumberFeaturesTile from '@ngageoint/geopackage/lib/tiles/features/custom/numberFeaturesTile'

export default class GPKGVectorTileRenderer {
  geopackage
  initialized
  featureTableName
  featureDao
  featureTile
  maxFeatures

  constructor (geopackage, featureTableName, maxFeatures) {
    this.geopackage = geopackage
    this.featureTableName = featureTableName
    this.initialized = false
    this.maxFeatures = maxFeatures
  }

  async init () {
    this.featureDao = this.geopackage.getFeatureDao(this.featureTableName)
    this.featureTile = new FeatureTiles(this.featureDao, 256, 256)
    this.featureTile.setMaxFeaturesTileDraw(new NumberFeaturesTile())
    this.featureTile.setMaxFeaturesPerTile(this.maxFeatures)
  }

  async setGeoPackage (geopackage) {
    this.geopackage = geopackage
    await this.init()
  }

  async setMaxFeaturesPerTile (maxFeatures) {
    if (maxFeatures > 0) {
      this.featureTile.setMaxFeaturesTileDraw(new NumberFeaturesTile())
      this.featureTile.setMaxFeaturesPerTile(maxFeatures)
    } else {
      this.featureTile.setMaxFeaturesTileDraw(undefined)
      this.featureTile.setMaxFeaturesPerTile(undefined)
    }
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
