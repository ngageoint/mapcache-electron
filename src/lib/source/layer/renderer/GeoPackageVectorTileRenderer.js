import { FeatureTiles, NumberFeaturesTile, GeoPackageAPI } from '@ngageoint/geopackage'
import _ from 'lodash'

export default class GeoPackageVectorTileRenderer {
  filePath
  geopackage
  featureTableName
  featureDao
  featureTile
  maxFeatures

  constructor (filePath, featureTableName, maxFeatures) {
    this.filePath = filePath
    this.featureTableName = featureTableName
    this.maxFeatures = maxFeatures
  }

  async init () {
    this.geopackage = await GeoPackageAPI.open(this.filePath)
    this.featureDao = this.geopackage.getFeatureDao(this.featureTableName)
    this.featureTile = new FeatureTiles(this.featureDao, 256, 256)
    this.updateMaxFeatures(this.maxFeatures)
    this.featureTile.iconCacheSize = 1000
  }

  updateMaxFeatures (maxFeatures) {
    this.maxFeatures = maxFeatures
    if (!_.isNil(this.maxFeatures) && this.maxFeatures > 0) {
      this.featureTile.maxFeaturesTileDraw = new NumberFeaturesTile()
      this.featureTile.maxFeaturesPerTile = this.maxFeatures
    }
  }

  close () {
    if (this.geopackage) {
      this.featureDao = undefined
      this.featureTile = undefined
      try {
        this.geopackage.close()
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
      }
      this.geopackage = undefined
    }
  }

  async styleChanged () {
    this.close()
    await this.init()
  }

  async renderVectorTile (coords, tileCanvas, done) {
    let {x, y, z} = coords
    if (tileCanvas) {
      this.featureTile.drawTile(x, y, z, tileCanvas).then(() => {
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
