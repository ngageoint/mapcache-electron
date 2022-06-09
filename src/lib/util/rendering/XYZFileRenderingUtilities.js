import path from 'path'
import jetpack from 'fs-jetpack'
import { WEB_MERCATOR } from '../../projection/ProjectionConstants'
import { getWGS84BoundingBoxFromXYZ, getWGS84ExtentFromXYZ } from '../xyz/WGS84XYZTileUtilities'
import { tilesInExtentAtZoom, trimExtentToWebMercatorMax } from '../xyz/XYZTileUtilities'
import { convertToWebMercator } from '../../projection/ProjectionUtilities'
 import { getWebMercatorBoundingBoxFromXYZ } from '../tile/TileBoundingBoxUtils'
import { compileTiles } from '../tile/TileCompilationUtilities'

function requestTile (tileRequest) {
  return new Promise((resolve) => {
    const {
      coords,
      filePath,
      width,
      height,
      crs
    } = tileRequest
    if (crs === WEB_MERCATOR) {
      let { x, y, z } = coords
      let tileData = null
      const tileFile = path.join(filePath, z.toString(), x.toString(), y.toString() + '.png')
      jetpack.existsAsync(tileFile).then(exists => {
        if (exists) {
          jetpack.readAsync(tileFile, 'buffer').then(data => {
            tileData = 'data:image/png;base64,' + Buffer.from(data).toString('base64')
            resolve(tileData)
          })
        } else {
          resolve(null)
        }
      }).catch(() => {
        resolve(null)
      })
    } else {
      const targetBounds = getWGS84BoundingBoxFromXYZ(coords.x, coords.y, coords.z)
      const extent = getWGS84ExtentFromXYZ(coords.x, coords.y, coords.z)
      const tiles = tilesInExtentAtZoom([[extent[1], extent[0]], [extent[3], extent[2]]], Math.min(20, coords.z + 1))
      const webMercatorExtent = convertToWebMercator(trimExtentToWebMercatorMax(extent))
      const results = tiles.map(tile => {
        let base64Image
        const tileFile = path.join(filePath, tile.z.toString(), tile.x.toString(), tile.y.toString() + '.png')
        if (jetpack.exists(tileFile)) {
          base64Image = 'data:image/png;base64,' + Buffer.from(jetpack.read(tileFile, 'buffer')).toString('base64')
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
  })
}

export {
  requestTile
}
