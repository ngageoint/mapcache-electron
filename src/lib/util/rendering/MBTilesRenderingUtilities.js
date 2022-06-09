import { getDb, getTile, close, getVectorTileFeaturesFromDb, drawVectorFeaturesInCanvas } from './MBTilesUtilities'
import { ProjectionConstants } from '@ngageoint/geopackage'
import {
  getWGS84BoundingBoxFromXYZ,
  getWGS84ExtentFromXYZ
} from '../xyz/WGS84XYZTileUtilities'
import { convertToWebMercator } from '../../projection/ProjectionUtilities'
import { tilesInExtentAtZoom, trimExtentToWebMercatorMax } from '../xyz/XYZTileUtilities'
import { getWebMercatorBoundingBoxFromXYZ } from '../tile/TileBoundingBoxUtils'
import { WEB_MERCATOR } from '../../projection/ProjectionConstants'
import { compileTiles } from '../tile/TileCompilationUtilities'

function requestTile (tileRequest) {
  return new Promise((resolve, reject) => {
    const {
      format,
      dbFile,
      coords,
      pointStyle,
      lineStyle,
      polygonStyle,
      crs,
      width,
      height
    } = tileRequest
    let db
    try {
      db = getDb(dbFile)
      if (crs === ProjectionConstants.EPSG_3857) {
        let base64Image
        if (format === 'pbf') {
          base64Image = drawVectorFeaturesInCanvas(getVectorTileFeaturesFromDb(db, coords.z, coords.x, coords.y), pointStyle, lineStyle, polygonStyle)
        } else {
          base64Image = getTile(db, coords.z, coords.x, coords.y, format)
        }
        resolve(base64Image)
      } else {
        // crs is 4326, so we need to pull all tiles that make up the bounds of the 4326 tile and compile them into the appropriate tile
        const targetBounds = getWGS84BoundingBoxFromXYZ(coords.x, coords.y, coords.z)
        const extent = getWGS84ExtentFromXYZ(coords.x, coords.y, coords.z)
        const tiles = tilesInExtentAtZoom([[extent[1], extent[0]], [extent[3], extent[2]]], Math.min(20, coords.z + 1))
        const webMercatorExtent = convertToWebMercator(trimExtentToWebMercatorMax(extent))

        const results = tiles.map(tile => {
          let base64Image
          if (format === 'pbf') {
            base64Image = drawVectorFeaturesInCanvas(getVectorTileFeaturesFromDb(db, tile.z, tile.x, tile.y), pointStyle, lineStyle, polygonStyle)
          } else {
            base64Image = getTile(db, tile.z, tile.x, tile.y, format)
          }
          const tileWebMercatorBounds = getWebMercatorBoundingBoxFromXYZ(tile.x, tile.y, tile.z)
          return {
            dataUrl: base64Image,
            width: width,
            height: height,
            tileBounds: [tileWebMercatorBounds.minLon, tileWebMercatorBounds.minLat, tileWebMercatorBounds.maxLon, tileWebMercatorBounds.maxLat],
            imageBounds: [webMercatorExtent.minLon, webMercatorExtent.minLat, webMercatorExtent.maxLon, webMercatorExtent.maxLat],
            tileSRS: WEB_MERCATOR
          }
        })
        compileTiles({
          tiles: results,
          size: {
            x: width,
            y: height
          },
          clippingRegion: null,
          targetSrs: crs,
          targetBounds,
        }).then(result => {
          resolve(result)
        }).catch(() => {
          resolve(null)
        })
      }
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
