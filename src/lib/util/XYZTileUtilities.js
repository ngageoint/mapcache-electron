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
  var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z)
  return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))))
}

function long2tile (lon, zoom) {
  return Math.min(Math.pow(2, zoom) - 1, (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))))
}

function lat2tile (lat, zoom) {
  return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)))
}

function trimToWebMercatorMax(boundingBox) {
  if (boundingBox) {
    const copy = boundingBox.slice()
    copy[0][0] = Math.max(boundingBox[0][0], -85.0511)
    copy[1][0] = Math.min(boundingBox[1][0], 85.0511)
    return copy
  } else {
    return boundingBox
  }
}

function calculateXTileRange (bbox, z) {
  const trimmedBbox = trimToWebMercatorMax(bbox)
  var west = long2tile(trimmedBbox[0][1], z)
  var east = long2tile(trimmedBbox[1][1], z)
  return {
    min: Math.max(0, Math.min(west, east)),
    max: Math.max(0, Math.max(west, east))
  }
}

function calculateYTileRange (bbox, z) {
  const trimmedBbox = trimToWebMercatorMax(bbox)
  var south = lat2tile(trimmedBbox[0][0], z)
  var north = lat2tile(trimmedBbox[1][0], z)
  return {
    min: Math.max(0, Math.min(south, north)),
    max: Math.max(0, Math.max(south, north)),
    current: Math.max(0, Math.min(south, north))
  }
}

function trimExtentToWebMercatorMax(extent) {
  if (extent) {
    const copy = extent.slice()
    copy[1] = Math.max(extent[1], -85.0511)
    copy[3] = Math.min(extent[3], 85.0511)
    return copy
  } else {
    return extent
  }
}

function tileBboxCalculator (x, y, z) {
  x = Number(x)
  y = Number(y)

  return {
    north: tile2lat(y, z),
    east: tile2lon(x + 1, z),
    south: tile2lat(y + 1, z),
    west: tile2lon(x, z)
  }
}

function tileCountInExtent (extent, minZoom, maxZoom) {
  const trimmedBbox = trimToWebMercatorMax(extent)
  var tiles = 0
  for (var zoom = minZoom; zoom <= maxZoom; zoom++) {
    var yRange = calculateYTileRange(trimmedBbox, zoom)
    var xRange = calculateXTileRange(trimmedBbox, zoom)
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

async function iterateAllTilesInExtentForZoomLevels (extent, zoomLevels, tileCallback) {
  const trimmedBbox = trimToWebMercatorMax(extent)
  let stop = false
  for (let i = 0; i <= zoomLevels.length && !stop; i++) {
    let z = zoomLevels[i]
    var yRange = calculateYTileRange(trimmedBbox, z)
    var xRange = calculateXTileRange(trimmedBbox, z)
    for (let x = xRange.min; x <= xRange.max && !stop; x++) {
      for (let y = yRange.min; y <= yRange.max && !stop; y++) {
        stop = await tileCallback({z, x, y})
      }
    }
  }
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

export {
  tile2lat,
  tile2lon,
  trimToWebMercatorMax,
  calculateXTileRange,
  calculateYTileRange,
  trimExtentToWebMercatorMax,
  tileBboxCalculator,
  tileCountInExtent,
  tileCountInExtentForZoomLevels,
  iterateAllTilesInExtentForZoomLevels,
  generateUrlForTile,
  fixXYZTileServerUrlForLeaflet
}
