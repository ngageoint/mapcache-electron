import { FeatureTiles, NumberFeaturesTile, GeoPackageAPI } from '@ngageoint/geopackage'
import GarbageCollector from '../../../GarbageCollector'

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
    if (this.maxFeatures && this.maxFeatures > 0) {
      this.featureTile.maxFeaturesTileDraw = new NumberFeaturesTile()
      this.featureTile.maxFeaturesPerTile = this.maxFeatures
    }
    this.featureTile.iconCacheSize = 1000
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

  async styleChanged (maxFeatures) {
    this.maxFeatures = maxFeatures
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
