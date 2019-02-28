Math.radians = function (degrees) {
  return degrees * Math.PI / 180
}

// Converts from radians to degrees.
Math.degrees = function (radians) {
  return radians * 180 / Math.PI
}

export default class XYZTileUtilities {
  static tile2lon (x, z) {
    return (x / Math.pow(2, z) * 360 - 180)
  }

  static tile2lat (y, z) {
    var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z)
    return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))))
  }

  static long2tile (lon, zoom) {
    return Math.min(Math.pow(2, zoom) - 1, (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))))
  }

  static lat2tile (lat, zoom) {
    return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)))
  }

  static getZoomLevelResolution (z) {
    let zoomLevelResolutions = [156412, 78206, 39103, 19551, 9776, 4888, 2444, 1222, 610.984, 305.492, 152.746, 76.373, 38.187, 19.093, 9.547, 4.773, 2.387, 1.193, 0.596, 0.298]
    return zoomLevelResolutions[z]
  }

  static tileBboxCalculator (x, y, z) {
    x = Number(x)
    y = Number(y)
    var tileBounds = {
      north: XYZTileUtilities.tile2lat(y, z),
      east: XYZTileUtilities.tile2lon(x + 1, z),
      south: XYZTileUtilities.tile2lat(y + 1, z),
      west: XYZTileUtilities.tile2lon(x, z)
    }

    return tileBounds
  }

  static calculateXTileRange (bbox, z) {
    var west = XYZTileUtilities.long2tile(bbox[0][1], z)
    var east = XYZTileUtilities.long2tile(bbox[1][1], z)
    return {
      min: Math.max(0, Math.min(west, east)),
      max: Math.max(0, Math.max(west, east))
    }
  }

  static calculateYTileRange (bbox, z) {
    var south = XYZTileUtilities.lat2tile(bbox[0][0], z)
    var north = XYZTileUtilities.lat2tile(bbox[1][0], z)
    return {
      min: Math.max(0, Math.min(south, north)),
      max: Math.max(0, Math.max(south, north)),
      current: Math.max(0, Math.min(south, north))
    }
  }

  static tileCountInExtent (extent, minZoom, maxZoom) {
    var tiles = 0
    for (var zoom = minZoom; zoom <= maxZoom; zoom++) {
      var yRange = XYZTileUtilities.calculateYTileRange(extent, zoom)
      var xRange = XYZTileUtilities.calculateXTileRange(extent, zoom)
      tiles += (1 + yRange.max - yRange.min) * (1 + xRange.max - xRange.min)
    }
    return tiles
  }

  static async iterateAllTilesInExtent (extent, minZoom, maxZoom, tileCallback) {
    let stop = false
    for (let z = minZoom; z <= maxZoom && !stop; z++) {
      var yRange = XYZTileUtilities.calculateYTileRange(extent, z)
      var xRange = XYZTileUtilities.calculateXTileRange(extent, z)
      for (let x = xRange.min; x <= xRange.max && !stop; x++) {
        for (let y = yRange.min; y <= yRange.max && !stop; y++) {
          stop = await tileCallback({z, x, y})
        }
      }
    }
  }
}
