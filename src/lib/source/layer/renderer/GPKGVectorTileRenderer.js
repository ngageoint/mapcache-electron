import GeoPackage from '@ngageoint/geopackage'
import FeatureTiles from '@ngageoint/geopackage/lib/tiles/features/index'
import NumberFeaturesTile from '@ngageoint/geopackage/lib/tiles/features/custom/numberFeaturesTile'
import GeoPackageVectorUtilities from '../../../GeoPackageVectorUtilities'

export default class GPKGVectorTileRenderer {
  geopackageFileName
  geopackage
  initialized
  featureTableName
  featureDao
  featureTile
  maxFeatures

  constructor (geopackageFileName, featureTableName, maxFeatures) {
    this.geopackageFileName = geopackageFileName
    this.featureTableName = featureTableName
    this.initialized = false
    this.maxFeatures = maxFeatures
  }

  async init () {
    if (!this.initialized) {
      this.geopackage = await GeoPackage.open(this.geopackageFileName)
      this.featureDao = this.geopackage.getFeatureDao(this.featureTableName)
      this.featureTile = new FeatureTiles(this.featureDao, 256, 256)
      this.featureTile.setMaxFeaturesTileDraw(new NumberFeaturesTile())
      this.featureTile.setMaxFeaturesPerTile(this.maxFeatures)
      this.initialized = true
    }
  }

  async updateStyle (layer) {
    await GeoPackageVectorUtilities.updateStyle(this.geopackage, layer)
    this.initialized = false
    this.maxFeatures = layer.style.maxFeatures
    await this.init()
  }

  // TODO: need to figure out a faster method for updating style of geopackage...

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
