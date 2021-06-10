import isNil from 'lodash/isNil'
import { BoundingBox, TileScaling, TileScalingType } from '@ngageoint/geopackage'
import { getBoundingBoxFromExtents, intersection } from '../util/TileBoundingBoxUtils'
import { tileCountInExtentForZoomLevels, tileCountInExtent } from '../util/XYZTileUtilities'

/**
 * Determines estimated tile count
 * @param boundingBoxFilter
 * @param dataSources
 * @param geopackageLayers
 * @param tileScaling
 * @param minZoom
 * @param maxZoom
 * @returns {{boundingBox: null, estimatedNumberOfTiles: number, tileScaling: null, zoomLevels: *[]}}
 */
function estimatedTileCount (boundingBoxFilter, dataSources, geopackageLayers, tileScaling = false, minZoom = 0, maxZoom = 20) {
  const results = {
    estimatedNumberOfTiles: 0,
    tileScaling: null,
    boundingBox: null,
    zoomLevels: []
  }

  let tilesToAdd = 0
  let tileScalingMethod
  let zoomOut
  let zoomIn
  let zoomLevels = []
  let boundingBox

  if (!isNil(minZoom) && !isNil(maxZoom) && !isNil(boundingBoxFilter)) {
    // we will use the intersection of the requested bounding box and the bounding box for all layers combined
    let extents = dataSources.map(dataSource => dataSource.extent)
    extents = extents.concat(geopackageLayers.map(geopackageLayer => geopackageLayer.type === 'feature' ? geopackageLayer.geopackage.tables.features[geopackageLayer.table].extent : geopackageLayer.geopackage.tables.tiles[geopackageLayer.table].extent))
    if (extents.length > 0) {
      boundingBox = getBoundingBoxFromExtents(extents)
    }
    if (!isNil(boundingBox)) {
      const result = intersection(
        new BoundingBox(boundingBox[0], boundingBox[2], boundingBox[1], boundingBox[3]),
        new BoundingBox(boundingBoxFilter[0], boundingBoxFilter[2], boundingBoxFilter[1], boundingBoxFilter[3])
      )
      boundingBox = [[result[1], result[0]], [result[3], result[2]]]
    } else {
      boundingBox = [[boundingBoxFilter[1], boundingBoxFilter[0]], [boundingBoxFilter[3], boundingBoxFilter[2]]]
    }
    if (tileScaling) {
      let onlyOneTile = false
      for (let zoom = maxZoom; zoom >= minZoom; zoom -= 1) {
        const tiles = tileCountInExtentForZoomLevels(boundingBox, [zoom])
        if (tiles > 1 || (tiles === 1 && !onlyOneTile)) {
          zoomLevels.push({
            zoom,
            tiles: tiles
          })
        }
        onlyOneTile = onlyOneTile || tiles === 1
      }

      // should have an array of zoom levels and the number of tiles they need. list will stop at first occurrence of only a single tile being generated
      // now i need to remove every other start with the smallest zoom level working my way up to the largest requested
      if (zoomLevels.length > 1) {
        for (let i = 0; i <= zoomLevels.length; i += 2) {
          zoomLevels.splice(i, 1)
        }
      }

      zoomIn = zoomLevels[zoomLevels.length - 1].zoom - minZoom
      zoomOut = 1
      tileScalingMethod = TileScalingType.IN_OUT
      zoomLevels = zoomLevels.map(zoomLevel => zoomLevel.zoom)
      tilesToAdd = tileCountInExtentForZoomLevels(boundingBox, zoomLevels)
      const tileScalingRecord = new TileScaling()
      tileScalingRecord.scaling_type = tileScalingMethod
      tileScalingRecord.zoom_in = zoomIn
      tileScalingRecord.zoom_out = zoomOut
      results.tileScaling = tileScalingRecord
    } else {
      for (let zoom = minZoom; zoom <= maxZoom; zoom += 1) {
        zoomLevels.push(zoom)
      }
      tilesToAdd = tileCountInExtent(boundingBox, minZoom, maxZoom)
    }
  }
  results.estimatedNumberOfTiles = tilesToAdd
  results.boundingBox = boundingBox
  results.zoomLevels = zoomLevels
  return results
}

export {
  estimatedTileCount
}
