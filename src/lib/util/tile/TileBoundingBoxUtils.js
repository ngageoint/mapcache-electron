import { wgs84ToWebMercator } from '../../projection/ProjectionUtilities'
import bbox from '@turf/bbox'
import intersect from '@turf/intersect'
import isNil from 'lodash/isNil'

const WEB_MERCATOR_HALF_WORLD_WIDTH = wgs84ToWebMercator.forward([180, 0])[0]

/**
 *  Get the tiles per side, width and height, at the zoom level
 *
 *  @param zoom zoom level
 *
 *  @return number tiles per side
 */
function tilesPerSideWithZoom (zoom) {
  return Math.pow(2, zoom)
}

function tileIntersectsXYZ (x, y, z, extent) {
  let tileBbox = getWebMercatorBoundingBoxFromXYZ(x, y, z)
  // assumes projection from 3857 to 4326
  let tileUpperRight = wgs84ToWebMercator.inverse([tileBbox.maxLon, tileBbox.maxLat])
  let tileLowerLeft = wgs84ToWebMercator.inverse([tileBbox.minLon, tileBbox.minLat])
  return tileIntersects(tileUpperRight, tileLowerLeft, [extent[2], extent[3]], [extent[0], extent[1]])
}

/**
 *  Get the tile size in meters
 *
 *  @param tilesPerSide tiles per side
 *
 *  @return number meters
 */
function tileSizeWithTilesPerSide (tilesPerSide) {
  return (2 * WEB_MERCATOR_HALF_WORLD_WIDTH) / tilesPerSide
}

function getBoundingBoxFromExtents (extentsArray) {
  if (extentsArray.length === 0) {
    return null
  }
  let mergedExtent
  extentsArray.forEach(extent => {
    if (isNil(mergedExtent)) {
      mergedExtent = extent.slice()
    } else {
      mergedExtent[0] = Math.min(mergedExtent[0], extent[0])
      mergedExtent[1] = Math.min(mergedExtent[1], extent[1])
      mergedExtent[2] = Math.max(mergedExtent[2], extent[2])
      mergedExtent[3] = Math.max(mergedExtent[3], extent[3])
    }
  })
  return mergedExtent
}

function intersection (boundingBoxA, boundingBoxB) {
  return bbox(intersect(boundingBoxA.toGeoJSON().geometry, boundingBoxB.toGeoJSON().geometry))
}

/**
 * Get the Web Mercator tile bounding box from the Standard Maps API tile
 * coordinates and zoom level
 *
 *  @param x    x
 *  @param y    y
 *  @param zoom zoom level
 *
 *  @return Object web mercator bounding box
 */
function getWebMercatorBoundingBoxFromXYZ (x, y, zoom) {
  var tilesPerSide = tilesPerSideWithZoom(zoom)
  var tileSize = tileSizeWithTilesPerSide(tilesPerSide)

  var minLon = (-1 * WEB_MERCATOR_HALF_WORLD_WIDTH) + (x * tileSize)
  var maxLon = (-1 * WEB_MERCATOR_HALF_WORLD_WIDTH) + ((x + 1) * tileSize)
  var minLat = WEB_MERCATOR_HALF_WORLD_WIDTH - ((y + 1) * tileSize)
  var maxLat = WEB_MERCATOR_HALF_WORLD_WIDTH - (y * tileSize)

  minLon = Math.max((-1 * WEB_MERCATOR_HALF_WORLD_WIDTH), minLon)
  maxLon = Math.min(WEB_MERCATOR_HALF_WORLD_WIDTH, maxLon)
  minLat = Math.max((-1 * WEB_MERCATOR_HALF_WORLD_WIDTH), minLat)
  maxLat = Math.min(WEB_MERCATOR_HALF_WORLD_WIDTH, maxLat)

  return {minLon, maxLon, minLat, maxLat}
}

function tileIntersects (tileBboxUR, tileBboxLL, geotiffBboxUR, geotiffBboxLL) {
  let r2 = {
    left: tileBboxLL[0],
    right: tileBboxUR[0],
    top: tileBboxUR[1],
    bottom: tileBboxLL[1]
  }
  let r1 = {
    left: geotiffBboxLL[0],
    right: geotiffBboxUR[0],
    top: geotiffBboxUR[1],
    bottom: geotiffBboxLL[1]
  }

  return !(r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top < r1.bottom ||
    r2.bottom > r1.top)
}

export {
  WEB_MERCATOR_HALF_WORLD_WIDTH,
  tilesPerSideWithZoom,
  tileSizeWithTilesPerSide,
  getBoundingBoxFromExtents,
  intersection,
  getWebMercatorBoundingBoxFromXYZ,
  tileIntersects,
  tileIntersectsXYZ
}
