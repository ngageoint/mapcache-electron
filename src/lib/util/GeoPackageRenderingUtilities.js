import { FeatureTiles, NumberFeaturesTile } from '@ngageoint/geopackage'
import GeoPackageCommon from '../geopackage/GeoPackageCommon'

/**
 * GeoPackageRenderingUtilities
 */
export default class GeoPackageRenderingUtilities {
  static requestVectorTileWithFeatureTiles(tileRequest, featureTile) {
    const {
      coords,
    } = tileRequest
    let {x, y, z} = coords
    return featureTile.drawTile(x, y, z)
  }

  static requestVectorTile (tileRequest) {
    return new Promise((resolve, reject) => {
      const {
        dbFile,
        tableName,
        maxFeatures
      } = tileRequest
      GeoPackageCommon.performSafeGeoPackageOperation(dbFile, async (gp) => {
        const featureDao = gp.getFeatureDao(tableName)
        const featureTiles = new FeatureTiles(featureDao, 256, 256)
        featureTiles.cacheGeometries = false
        featureTiles.maxFeaturesPerTile = maxFeatures
        featureTiles.maxFeaturesTileDraw = new NumberFeaturesTile()
        const tile = await GeoPackageRenderingUtilities.requestVectorTileWithFeatureTiles(tileRequest, featureTiles)
        featureTiles.cleanup()
        return tile
      }, true).then(base64Image => resolve(base64Image)).catch(e => {
        reject(e)
      })
    })
  }

  static requestImageryTileWithGeoPackage(tileRequest, gp) {
    const {
      coords,
      tableName
    } = tileRequest
    let {x, y, z} = coords
    return gp.xyzTile(tableName, x, y, z, 256, 256)
  }

  static requestImageryTile (tileRequest) {
    return new Promise((resolve, reject) => {
      const {
        dbFile,
      } = tileRequest
      GeoPackageCommon.performSafeGeoPackageOperation(dbFile, async (geopackage) => {
        return await GeoPackageRenderingUtilities.requestImageryTileWithGeoPackage(tileRequest, geopackage)
      }, true).then(base64Image => resolve(base64Image)).catch(e => {
        reject(e)
      })
    })
  }
}
