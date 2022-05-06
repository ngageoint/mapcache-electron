import { getDb, getTile, close, getVectorTileFeaturesFromDb, drawVectorFeaturesInCanvas } from './MBTilesUtilities'

function requestTile (tileRequest) {
  return new Promise((resolve, reject) => {
    const {
      format,
      dbFile,
      coords,
      pointStyle,
      lineStyle,
      polygonStyle
    } = tileRequest
    let db
    try {
      db = getDb(dbFile)
      let base64Image
      if (format === 'pbf') {
        base64Image = drawVectorFeaturesInCanvas(getVectorTileFeaturesFromDb(db, coords.z, coords.x, coords.y), pointStyle, lineStyle, polygonStyle)
      } else {
        base64Image = getTile(db, coords.z, coords.x, coords.y, format)
      }
      resolve(base64Image)
    } catch (e) {
      reject(e)
    } finally {
      close(db)
    }
  })
}

/**
 * MBTilesRenderingUtilities
 */
export {
  requestTile
}
