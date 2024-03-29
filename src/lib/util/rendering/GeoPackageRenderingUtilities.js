import { FeatureTiles, NumberFeaturesTile } from '@ngageoint/geopackage'
import { performSafeGeoPackageOperation } from '../../geopackage/GeoPackageCommon'
import { DEFAULT_TILE_SIZE } from '../tile/TileConstants'

function requestVectorTileWithFeatureTiles (tileRequest, featureTile) {
  const {
    coords,
  } = tileRequest
  let { x, y, z } = coords
  return featureTile.drawTile(x, y, z)
}

function requestImageryTileWithGeoPackage (tileRequest, gp) {
  const {
    coords,
    tableName
  } = tileRequest
  let { x, y, z } = coords
  return gp.xyzTile(tableName, x, y, z, DEFAULT_TILE_SIZE, DEFAULT_TILE_SIZE)
}

function requestVectorTile (tileRequest) {
  return new Promise((resolve, reject) => {
    const {
      dbFile,
      tableName,
      maxFeatures
    } = tileRequest
    performSafeGeoPackageOperation(dbFile, async (gp) => {
      const featureDao = gp.getFeatureDao(tableName)
      const featureTiles = new FeatureTiles(featureDao, DEFAULT_TILE_SIZE, DEFAULT_TILE_SIZE)
      featureTiles.scale = 1.0
      featureTiles.cacheGeometries = false
      featureTiles.maxFeaturesPerTile = maxFeatures
      featureTiles.maxFeaturesTileDraw = new NumberFeaturesTile()
      const tile = await requestVectorTileWithFeatureTiles(tileRequest, featureTiles)
      featureTiles.cleanup()
      return tile
    }, true).then(base64Image => resolve(base64Image)).catch(e => {
      // eslint-disable-next-line no-console
      console.error('Failed to render tile.')
      reject(e)
    })
  })
}

function requestImageryTile (tileRequest) {
  return new Promise((resolve, reject) => {
    const {
      dbFile,
    } = tileRequest
    performSafeGeoPackageOperation(dbFile, async (geopackage) => {
      return await requestImageryTileWithGeoPackage(tileRequest, geopackage)
    }, true).then(base64Image => resolve(base64Image)).catch(e => {
      reject(e)
    })
  })
}

/**
 * GeoPackageRenderingUtilities
 */
export {
  requestVectorTile,
  requestImageryTile
}
