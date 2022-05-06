Math.radians = function (degrees) {
  return degrees * Math.PI / 180
}

// Converts from radians to degrees.
Math.degrees = function (radians) {
  return radians * 180 / Math.PI
}

function tile2lon (x, z) {
  return (x / Math.pow(2, z) * 360 - 180)
}

function tile2lat (y, z) {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z)
  return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))))
}

function long2tile (lon, z) {
  const zoom = Number(z)
  return Math.min(Math.pow(2, zoom) - 1, (Math.floor((lon + 180.0) / 360.0 * Math.pow(2, zoom))))
}

function lat2tile (lat, z) {
  const zoom = Number(z)
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180.0) + 1 / Math.cos(lat * Math.PI / 180.0)) / Math.PI) / 2 * Math.pow(2, zoom))
}

function trimToWebMercatorMax (boundingBox) {
  if (boundingBox) {
    const copy = boundingBox.slice()
    copy[0][0] = Math.max(boundingBox[0][0], -85.051128)
    copy[1][0] = Math.min(boundingBox[1][0], 85.051128)
    return copy
  } else {
    return boundingBox
  }
}

function calculateXTileRange (bbox, z) {
  const trimmedBbox = trimToWebMercatorMax(bbox)
  const west = long2tile(trimmedBbox[0][1], z)
  const east = long2tile(trimmedBbox[1][1], z)
  return {
    min: Math.max(0, Math.min(west, east)),
    max: Math.max(0, Math.max(west, east))
  }
}

function calculateYTileRange (bbox, z) {
  const trimmedBbox = trimToWebMercatorMax(bbox)
  const south = lat2tile(trimmedBbox[0][0], z)
  const north = lat2tile(trimmedBbox[1][0], z)
  return {
    min: Math.max(0, Math.min(south, north)),
    max: Math.max(0, Math.max(south, north))
  }
}

function calculateXTileRangeForExtent (extent, z) {
  const west = long2tile(extent[0], z)
  const east = long2tile(extent[2], z)
  return {
    min: Math.max(0, Math.min(west, east)),
    max: Math.max(0, Math.max(west, east))
  }
}

function calculateYTileRangeForExtent (extent, z) {
  const south = lat2tile(extent[1], z)
  const north = lat2tile(extent[3], z)
  return {
    min: Math.max(0, Math.min(south, north)),
    max: Math.max(0, Math.max(south, north))
  }
}

function trimExtentToWebMercatorMax (extent) {
  if (extent) {
    const copy = extent.slice()
    copy[1] = Math.max(extent[1], -85.051128)
    copy[3] = Math.min(extent[3], 85.051128)
    return copy
  } else {
    return extent
  }
}

function tileBboxCalculator (x, y, z) {
  z = Number(z)
  x = Number(x)
  y = Number(y)

  return {
    north: tile2lat(y, z),
    east: tile2lon(x + 1, z),
    south: tile2lat(y + 1, z),
    west: tile2lon(x, z)
  }
}

function tilesInExtentAtZoom (extent, z) {
  const trimmedBbox = trimToWebMercatorMax(extent)
  const tiles = []
  const yRange = calculateYTileRange(trimmedBbox, z)
  const xRange = calculateXTileRange(trimmedBbox, z)
  for (let x = xRange.min; x <= xRange.max; x++) {
    for (let y = yRange.min; y <= yRange.max; y++) {
      tiles.push({ x, y, z })
    }
  }
  return tiles
}

function tileCountInExtent (extent, minZoom, maxZoom) {
  const trimmedBbox = trimToWebMercatorMax(extent)
  let tiles = 0
  for (let z = minZoom; z <= maxZoom; z++) {
    const zoom = Number(z)
    const yRange = calculateYTileRange(trimmedBbox, zoom)
    const xRange = calculateXTileRange(trimmedBbox, zoom)
    tiles += (1 + yRange.max - yRange.min) * (1 + xRange.max - xRange.min)
  }
  return tiles
}

function tileCountInExtentForZoomLevels (extent, zoomLevels) {
  const trimmedBbox = trimToWebMercatorMax(extent)
  var tiles = 0
  zoomLevels.forEach(zoom => {
    var yRange = calculateYTileRange(trimmedBbox, zoom)
    var xRange = calculateXTileRange(trimmedBbox, zoom)
    tiles += (1 + yRange.max - yRange.min) * (1 + xRange.max - xRange.min)
  })
  return tiles
}

/**
 * Generates the XYZ tile request url for a given x, y, and z
 * @param url
 * @param subdomains
 * @param x
 * @param y
 * @param z
 */
function generateUrlForTile (url, subdomains, x, y, z) {
  let urlCopy = url
  if (subdomains.length > 0) {
    const index = Math.abs(x + y) % subdomains.length
    urlCopy = urlCopy.replace('{s}', subdomains[index])
  }
  return urlCopy.replace('{z}', z).replace('{x}', x).replace('{y}', y)
}

/**
 * Ensures that the xyz url adheres to leaflets requirements
 *  - no $ in front of designators
 *  - designators must be lowercase
 * @param filePath
 * @returns {string}
 */
function fixXYZTileServerUrlForLeaflet (filePath) {
  return filePath.replaceAll('${', '{').replace('{X}', '{x}').replace('{Y}', '{y}').replace('{Z}', '{z}').replace('{S}', '{s}')
}

/**
 * Determines the intersection of two bounding boxes intersect
 * @param bbox1
 * @param bbox2
 * @return {null || {maxLongitude: number, minLatitude: number, minLongitude: number, maxLatitude: number}}
 */
function getIntersection (bbox1, bbox2) {
  let intersection = null
  const minLon = Math.max(bbox1.minLongitude, bbox2.minLongitude)
  const minLat = Math.max(bbox1.minLatitude, bbox2.minLatitude)
  const maxLon = Math.min(bbox1.maxLongitude, bbox2.maxLongitude)
  const maxLat = Math.min(bbox1.maxLatitude, bbox2.maxLatitude)
  if (minLon < maxLon && minLat < maxLat) {
    intersection = {
      minLongitude: minLon,
      maxLongitude: maxLon,
      minLatitude: minLat,
      maxLatitude: maxLat,
    }
  }
  return intersection
}

/**
 * Determines the clipping region between the tile's bounds and the layer's bounds.
 * @param tileBounds
 * @param layerBounds
 * @returns {{intersection: ({maxLongitude: number, minLatitude: number, minLongitude: number, maxLatitude: number}|null), tileBoundingBox: {maxLongitude: (number|*), minLatitude: (number|*), minLongitude: (number|*), maxLatitude: (number|*)}, tileWidth: number, tileHeight: number}}
 */
function getClippingRegion (tileBounds, layerBounds) {
  const tileBoundingBox = {
    minLongitude: tileBounds.minLon,
    maxLongitude: tileBounds.maxLon,
    minLatitude: tileBounds.minLat,
    maxLatitude: tileBounds.maxLat,
  }
  const layerBoundingBox = {
    minLongitude: layerBounds.minLon,
    maxLongitude: layerBounds.maxLon,
    minLatitude: layerBounds.minLat,
    maxLatitude: layerBounds.maxLat,
  }
  return {
    intersection: getIntersection(tileBoundingBox, layerBoundingBox),
    tileBounds: tileBoundingBox,
    tileWidth: tileBoundingBox.maxLongitude - tileBoundingBox.minLongitude,
    tileHeight: tileBoundingBox.maxLatitude - tileBoundingBox.minLatitude
  }
}

export {
  lat2tile,
  long2tile,
  tile2lat,
  tile2lon,
  trimToWebMercatorMax,
  calculateXTileRange,
  calculateYTileRange,
  calculateXTileRangeForExtent,
  calculateYTileRangeForExtent,
  trimExtentToWebMercatorMax,
  tileBboxCalculator,
  tileCountInExtent,
  tileCountInExtentForZoomLevels,
  generateUrlForTile,
  fixXYZTileServerUrlForLeaflet,
  getIntersection,
  tilesInExtentAtZoom,
  getClippingRegion
}
