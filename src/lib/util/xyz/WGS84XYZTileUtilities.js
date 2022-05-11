import { WGS84_HALF_WORLD_LAT_HEIGHT, WGS84_HALF_WORLD_LON_WIDTH } from '../../projection/ProjectionConstants'
import { TileGrid } from '../tile/TileGrid'

function tilesPerSideWithZoom (zoom) {
  return Math.pow(2, zoom)
}

Math.radians = function (degrees) {
  return degrees * Math.PI / 180
}

// Converts from radians to degrees.
Math.degrees = function (radians) {
  return radians * 180 / Math.PI
}

function trimExtentToWGS84Max (extent) {
  if (extent) {
    const copy = extent.slice()
    copy[0] = Math.min(180.0, Math.max(-180.0, copy[0]))
    copy[1] = Math.min(90.0, Math.max(-90.0, copy[1]))
    copy[2] = Math.min(180.0, Math.max(-180.0, copy[2]))
    copy[3] = Math.min(90.0, Math.max(-90.0, copy[3]))
    return copy
  } else {
    return extent
  }
}

function trimBboxToWGS84Max (bounds) {
  if (bounds) {
    const copy = Object.assign({}, bounds)
    copy.minLon = Math.min(180.0, Math.max(-180.0, copy.minLon))
    copy.minLat = Math.min(90.0, Math.max(-90.0, copy.minLat))
    copy.maxLon = Math.min(180.0, Math.max(-180.0, copy.maxLon))
    copy.maxLat = Math.min(90.0, Math.max(-90.0, copy.maxLat))
    return copy
  } else {
    return bounds
  }
}

function tile2lon (x, z) {
  return (x / Math.pow(2, z + 1) * 360 - 180)
}

function tile2lat (y, z) {
  return ((Math.pow(2, z) - y) / Math.pow(2, z) * 180 - 90)
}

function long2tile (lon, z) {
  const zoom = Number(z)
  const tilesPerSide = Math.pow(2, zoom + 1)
  return Math.min(tilesPerSide - 1, Math.floor((lon + 180.0) / 360.0 * tilesPerSide))
}

function lat2tile (lat, z) {
  const zoom = Number(z)
  return (Math.pow(2, zoom) - 1) - Math.min(Math.pow(2, zoom) - 1, (Math.floor((lat + 90.0) / 180.0 * Math.pow(2, zoom))))
}


function calculateXTileRangeForExtent (extent, z) {
  const zoom = Number(z)
  const trimmedExtent = trimExtentToWGS84Max(extent)
  const west = long2tile(trimmedExtent[0], zoom)
  const east = long2tile(trimmedExtent[2], zoom)
  return {
    min: Math.min(Math.pow(2, zoom + 1), Math.max(0, Math.min(west, east))),
    max: Math.min(Math.pow(2, zoom + 1), Math.max(0, Math.max(west, east)))
  }
}

function calculateYTileRangeForExtent (extent, z) {
  const zoom = Number(z)
  const trimmedExtent = trimExtentToWGS84Max(extent)
  const south = lat2tile(trimmedExtent[1], zoom)
  const north = lat2tile(trimmedExtent[3], zoom)
  return {
    min: Math.min(Math.pow(2, zoom), Math.max(0, Math.min(south, north))),
    max: Math.min(Math.pow(2, zoom), Math.max(0, Math.max(south, north)))
  }
}

function tileBboxCalculator (x, y, z) {
  x = Number(x)
  y = Number(y)
  z = Number(z)

  return {
    north: tile2lat(y + 1, z),
    east: tile2lon(x + 1, z),
    south: tile2lat(y, z),
    west: tile2lon(x, z)
  }
}

function tileExtentCalculator (x, y, z) {
  x = Number(x)
  y = Number(y)
  z = Number(z)

  const x1 = tile2lon(x, z)
  const x2 = tile2lon(x + 1, z)
  const y1 = tile2lat(y, z)
  const y2 = tile2lat(y + 1, z)

  return [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)]
}

function tilesInExtentAtZoom (extent, z) {
  z = Number(z)
  const tiles = []
  const yRange = calculateYTileRangeForExtent(extent, z)
  const xRange = calculateXTileRangeForExtent(extent, z)
  for (let x = xRange.min; x <= xRange.max; x++) {
    for (let y = yRange.min; y <= yRange.max; y++) {
      tiles.push({ x, y, z })
    }
  }
  return tiles
}

function tileCountInExtent (extent, minZoom, maxZoom) {
  let tiles = 0
  for (let z = minZoom; z <= maxZoom; z++) {
    const zoom = Number(z)
    const yRange = calculateYTileRangeForExtent(extent, zoom)
    const xRange = calculateXTileRangeForExtent(extent, zoom)
    tiles += (1 + yRange.max - yRange.min) * (1 + xRange.max - xRange.min)
  }
  return tiles
}

function tileCountInExtentForZoomLevels (extent, zoomLevels) {
  let tiles = 0
  zoomLevels.forEach(z => {
    const zoom = Number(z)
    const yRange = calculateYTileRangeForExtent(extent, zoom)
    const xRange = calculateXTileRangeForExtent(extent, zoom)
    tiles += (1 + yRange.max - yRange.min) * (1 + xRange.max - xRange.min)
  })
  return tiles
}

function getWGS84BoundingBoxFromXYZ (x, y, zoom) {
  const tilesPerLat = tilesPerWGS84LatSide(zoom);
  const tilesPerLon = tilesPerWGS84LonSide(zoom);
  const tileSizeLat = tileSizeLatPerWGS84Side(tilesPerLat);
  const tileSizeLon = tileSizeLonPerWGS84Side(tilesPerLon);
  const minLon = (-1 * WGS84_HALF_WORLD_LON_WIDTH) + (x * tileSizeLon);
  const maxLon = (-1 * WGS84_HALF_WORLD_LON_WIDTH) + ((x + 1) * tileSizeLon);
  const minLat = WGS84_HALF_WORLD_LAT_HEIGHT - ((y + 1) * tileSizeLat);
  const maxLat = WGS84_HALF_WORLD_LAT_HEIGHT - (y * tileSizeLat);

  return { minLon, minLat, maxLon, maxLat }
}

function getWGS84ExtentFromXYZ (x, y, zoom) {
  const bounds = getWGS84BoundingBoxFromXYZ(x, y, zoom)
  return [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat]
}


function tilesPerWGS84LatSide(zoom) {
  return tilesPerSideWithZoom(zoom)
}

function tilesPerWGS84LonSide(zoom) {
  return 2.0 * tilesPerSideWithZoom(zoom)
}

function tileSizeLatPerWGS84Side(tilesPerLat) {
  return (2.0 * WGS84_HALF_WORLD_LAT_HEIGHT) / tilesPerLat
}

function tileSizeLonPerWGS84Side(tilesPerLon) {
  return (2.0 * WGS84_HALF_WORLD_LON_WIDTH) / tilesPerLon
}

function getTileGridWGS84 (extent, zoom) {
  const tilesPerLat = tilesPerWGS84LatSide(zoom)
  const tilesPerLon = tilesPerWGS84LonSide(zoom)

  const tileSizeLat = tileSizeLatPerWGS84Side(tilesPerLat)
  const tileSizeLon = tileSizeLonPerWGS84Side(tilesPerLon)

  let minX = Math.floor((extent[0] + WGS84_HALF_WORLD_LON_WIDTH) / tileSizeLon)
  let tempMaxX = (extent[2] + WGS84_HALF_WORLD_LON_WIDTH) / tileSizeLon
  let maxX = Math.ceil(tempMaxX)
  if (tempMaxX % 1 === 0) {
    maxX--
  }
  maxX = Math.min(maxX, tilesPerLon - 1)

  let minY = Math.floor(((extent[3] - WGS84_HALF_WORLD_LAT_HEIGHT) * -1) / tileSizeLat)
  let tempMaxY = ((extent[1] - WGS84_HALF_WORLD_LAT_HEIGHT) * -1) / tileSizeLat
  let maxY = Math.ceil(tempMaxY)
  if (tempMaxY % 1 === 0) {
    maxY--
  }
  maxY = Math.min(maxY, tilesPerLat - 1)

  return new TileGrid(minX, minY, maxX, maxY)
}

/**
 * Get tiles for an extent and zoom
 * @param extent
 * @param zoom
 */
function getTilesForExtentAtZoom (extent, zoom) {
  const tiles = []
  const tileGrid = getTileGridWGS84(extent, zoom)
  for (let x = tileGrid.minX; x <= tileGrid.maxX; x++) {
    for (let y = tileGrid.minY; y <= tileGrid.maxY; y++) {
      tiles.push({
        coords: { x, y, z: zoom },
        extent: getWGS84ExtentFromXYZ(x, y, zoom)
      })
    }
  }
  return tiles
}

export {
  lat2tile,
  long2tile,
  tile2lat,
  tile2lon,
  calculateXTileRangeForExtent,
  calculateYTileRangeForExtent,
  tileBboxCalculator,
  tileCountInExtent,
  tileCountInExtentForZoomLevels,
  tilesInExtentAtZoom,
  tileExtentCalculator,
  trimExtentToWGS84Max,
  trimBboxToWGS84Max,
  getTilesForExtentAtZoom,
  getWGS84BoundingBoxFromXYZ,
  getWGS84ExtentFromXYZ,
  getTileGridWGS84
}
