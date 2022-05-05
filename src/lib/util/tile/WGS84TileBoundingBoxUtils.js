import {
  calculateXTileRangeForExtent,
  calculateYTileRangeForExtent,
  tileExtentCalculator
} from '../xyz/WGS84XYZTileUtilities'

/**
 * 4326 bounds are -180, -90, 180, 90
 * @param extent
 * @param zoom
 */
function getTilesForExtentAtZoom (extent, zoom) {
  const tiles = []
  const xRange = calculateXTileRangeForExtent(extent, zoom)
  const yRange = calculateYTileRangeForExtent(extent, zoom)

  for (let x = xRange.min; x <= xRange.max; x++) {
    for (let y = yRange.min; y <= yRange.max; y++) {
      tiles.push({
        coords: {x, y, z: zoom},
        extent: tileExtentCalculator(x, y, zoom)
      })
    }
  }
  return tiles
}

export {
  getTilesForExtentAtZoom
}
