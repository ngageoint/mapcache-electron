Math.radians = function (degrees) {
  return degrees * Math.PI / 180
}

// Converts from radians to degrees.
Math.degrees = function (radians) {
  return radians * 180 / Math.PI
}

function trimExtentToWGS84Max(extent) {
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
      tiles.push({x, y, z})
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
  trimExtentToWGS84Max
}
