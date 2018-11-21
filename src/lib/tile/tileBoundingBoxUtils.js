/* eslint-disable */

import proj4 from 'proj4'

const WEB_MERCATOR_HALF_WORLD_WIDTH = proj4('EPSG:4326', 'EPSG:3857').forward([180, 0])[0];

/**
 * Get the Web Mercator tile bounding box from the Standard Maps API tile
 * coordinates and zoom level
 *
 *  @param x    x
 *  @param y    y
 *  @param zoom zoom level
 *
 *  @return web mercator bounding box
 */
export const getWebMercatorBoundingBoxFromXYZ = (x, y, zoom, options) => {
  var tilesPerSide = tilesPerSideWithZoom(zoom);
	var tileSize = tileSizeWithTilesPerSide(tilesPerSide);

  var meterBuffer = 0;
  if (options && options.buffer && options.tileSize) {
    var pixelBuffer = options.buffer;
    var metersPerPixel = tileSize / options.tileSize;
    meterBuffer = metersPerPixel * pixelBuffer;
  }

	var minLon = (-1 * WEB_MERCATOR_HALF_WORLD_WIDTH) + (x * tileSize) - meterBuffer;
	var maxLon = (-1 * WEB_MERCATOR_HALF_WORLD_WIDTH) + ((x + 1) * tileSize) + meterBuffer;
	var minLat = WEB_MERCATOR_HALF_WORLD_WIDTH - ((y + 1) * tileSize) - meterBuffer;
	var maxLat = WEB_MERCATOR_HALF_WORLD_WIDTH - (y * tileSize) + meterBuffer;

  minLon = Math.max((-1 * WEB_MERCATOR_HALF_WORLD_WIDTH), minLon);
  maxLon = Math.min(WEB_MERCATOR_HALF_WORLD_WIDTH, maxLon);
  minLat = Math.max((-1 * WEB_MERCATOR_HALF_WORLD_WIDTH), minLat);
  maxLat = Math.min(WEB_MERCATOR_HALF_WORLD_WIDTH, maxLat);

	var box = {minLon, maxLon, minLat, maxLat};

	return box;
}

/**
 *  Get the tile size in meters
 *
 *  @param tilesPerSide tiles per side
 *
 *  @return meters
 */
export const tileSizeWithTilesPerSide = tilesPerSide => {
  return (2*WEB_MERCATOR_HALF_WORLD_WIDTH) / tilesPerSide;
}

/**
 *  Get the tiles per side, width and height, at the zoom level
 *
 *  @param zoom zoom level
 *
 *  @return tiles per side
 */
export const tilesPerSideWithZoom = zoom => {
  return Math.pow(2,zoom);
}
