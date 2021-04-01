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

  static trimToWebMercatorMax(boundingBox) {
    if (boundingBox) {
      const copy = boundingBox.slice()
      copy[0][0] = Math.max(boundingBox[0][0], -85.0511)
      copy[1][0] = Math.min(boundingBox[1][0], 85.0511)
      return copy
    } else {
      return boundingBox
    }
  }

  static trimExtentToWebMercatorMax(extent) {
    if (extent) {
      const copy = extent.slice()
      copy[1] = Math.max(extent[1], -85.0511)
      copy[3] = Math.min(extent[3], 85.0511)
      return copy
    } else {
      return extent
    }
  }

  static tileBboxCalculator (x, y, z) {
    x = Number(x)
    y = Number(y)

    return {
      north: XYZTileUtilities.tile2lat(y, z),
      east: XYZTileUtilities.tile2lon(x + 1, z),
      south: XYZTileUtilities.tile2lat(y + 1, z),
      west: XYZTileUtilities.tile2lon(x, z)
    }
  }

  static calculateXTileRange (bbox, z) {
    const trimmedBbox = XYZTileUtilities.trimToWebMercatorMax(bbox)
    var west = XYZTileUtilities.long2tile(trimmedBbox[0][1], z)
    var east = XYZTileUtilities.long2tile(trimmedBbox[1][1], z)
    return {
      min: Math.max(0, Math.min(west, east)),
      max: Math.max(0, Math.max(west, east))
    }
  }

  static calculateYTileRange (bbox, z) {
    const trimmedBbox = XYZTileUtilities.trimToWebMercatorMax(bbox)
    var south = XYZTileUtilities.lat2tile(trimmedBbox[0][0], z)
    var north = XYZTileUtilities.lat2tile(trimmedBbox[1][0], z)
    return {
      min: Math.max(0, Math.min(south, north)),
      max: Math.max(0, Math.max(south, north)),
      current: Math.max(0, Math.min(south, north))
    }
  }

  static tileCountInExtent (extent, minZoom, maxZoom) {
    const trimmedBbox = XYZTileUtilities.trimToWebMercatorMax(extent)
    var tiles = 0
    for (var zoom = minZoom; zoom <= maxZoom; zoom++) {
      var yRange = XYZTileUtilities.calculateYTileRange(trimmedBbox, zoom)
      var xRange = XYZTileUtilities.calculateXTileRange(trimmedBbox, zoom)
      tiles += (1 + yRange.max - yRange.min) * (1 + xRange.max - xRange.min)
    }
    return tiles
  }

  static tileCountInExtentForZoomLevels (extent, zoomLevels) {
    const trimmedBbox = XYZTileUtilities.trimToWebMercatorMax(extent)
    var tiles = 0
    zoomLevels.forEach(zoom => {
      var yRange = XYZTileUtilities.calculateYTileRange(trimmedBbox, zoom)
      var xRange = XYZTileUtilities.calculateXTileRange(trimmedBbox, zoom)
      tiles += (1 + yRange.max - yRange.min) * (1 + xRange.max - xRange.min)
    })
    return tiles
  }

  static async iterateAllTilesInExtentForZoomLevels (extent, zoomLevels, tileCallback) {
    const trimmedBbox = XYZTileUtilities.trimToWebMercatorMax(extent)
    let stop = false
    for (let i = 0; i <= zoomLevels.length && !stop; i++) {
      let z = zoomLevels[i]
      var yRange = XYZTileUtilities.calculateYTileRange(trimmedBbox, z)
      var xRange = XYZTileUtilities.calculateXTileRange(trimmedBbox, z)
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
  static generateUrlForTile (url, subdomains, x, y, z) {
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
  static fixXYZTileServerUrlForLeaflet(filePath) {
    return filePath.replaceAll('${', '{').replace('{X}', '{x}').replace('{Y}', '{y}').replace('{Z}', '{z}').replace('{S}', '{s}')
  }
}
