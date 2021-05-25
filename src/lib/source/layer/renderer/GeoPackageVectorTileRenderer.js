import { FeatureTiles, NumberFeaturesTile } from '@ngageoint/geopackage'
import isNil from 'lodash/isNil'
import CanvasUtilities from '../../../util/CanvasUtilities'

export default class GeoPackageVectorTileRenderer {
  layer
  geopackage
  featureTableName
  featureDao
  featureTile
  maxFeatures

  constructor (layer) {
    this.layer = layer
    this.featureTableName = layer.name
  }

  close () {
    if (this.featureTile) {
      this.featureTile.cleanup()
    }
    this.featureTile = null
    this.featureDao = null
    this.geopackage = null
  }

  setGeoPackage (geopackage) {
    this.geopackage = geopackage
    this.featureDao = this.geopackage.getFeatureDao(this.featureTableName)
    if (this.featureTile) {
      this.featureTile.cleanup()
    }
    this.featureTile = new FeatureTiles(this.featureDao, 256, 256)
    this.updateMaxFeatures(this.maxFeatures)
  }

  updateMaxFeatures (maxFeatures) {
    this.maxFeatures = maxFeatures
    if (!isNil(this.maxFeatures) && this.maxFeatures > 0) {
      this.featureTile.maxFeaturesTileDraw = new NumberFeaturesTile()
      this.featureTile.maxFeaturesPerTile = this.maxFeatures
    }
  }

  async renderTile (coords, callback) {
    let {x, y, z} = coords
    if (this.geopackage) {
      const canvas = CanvasUtilities.createCanvas(256, 256)
      await this.featureTile.drawTile(x, y, z, canvas)
      const dataUrl = canvas.toDataURL();
      if (canvas.dispose) {
        canvas.dispose();
      }
      callback(null, dataUrl)
    } else {
      callback('GeoPackage connection not found.', null)
    }
  }
}
