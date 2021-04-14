import CanvasUtilities from './CanvasUtilities'
import {
  FeatureTiles,
  NumberFeaturesTile
} from '@ngageoint/geopackage'
import GeoPackageCommon from '../geopackage/GeoPackageCommon'

/**
 * GeoPackageRenderingUtilities
 */
export default class GeoPackageRenderingUtilities {
  static requestTile (tileRequest) {
    return new Promise((resolve, reject) => {
      const {
        dbFile,
        coords,
        tableName,
        maxFeatures
      } = tileRequest

      let {x, y, z} = coords

      GeoPackageCommon.performSafeGeoPackageOperation(dbFile, async (geopackage) => {
        const featureDao = geopackage.getFeatureDao(tableName)
        const featureTile = new FeatureTiles(featureDao, 256, 256)
        featureTile.maxFeaturesPerTile = maxFeatures
        featureTile.maxFeaturesTileDraw = new NumberFeaturesTile()
        featureTile.maxFeaturesTileDraw.defaultFontRegistered = true
        const canvas = CanvasUtilities.createCanvas(256, 256)
        await featureTile.drawTile(x, y, z, canvas)
        return canvas.toDataURL('image/png')
      }, true).then(base64Image => resolve(base64Image)).catch(e => {
        reject(e)
      })
    })
  }
}
