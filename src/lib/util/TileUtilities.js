import isNil from 'lodash/isNil'
import intersection from 'lodash/intersection'
import isEqual from 'lodash/isEqual'
import keys from 'lodash/keys'
import sortedUniq from 'lodash/sortedUniq'
import difference from 'lodash/difference'
import {
  trimExtentToWebMercatorMax,
  calculateXTileRangeForExtent,
  calculateYTileRangeForExtent,
  tileBboxCalculator
} from '../util/XYZTileUtilities'

/**
 * A tile set with a specified set of layers
 */
class LayerTileSet {
  constructor (tileSet, layers, required = false) {
    this.tileSet = tileSet
    this.layers = layers.slice()
    this.required = required
  }

  toString () {
    return this.tileSet.toString() + '[' + this.layers.join(', ') + ']'
  }

  /**
   * Determines if two tile sets are overlapping or adjacent, regardless of zoom level
   * @return {boolean}
   */
  isNear (other) {
    const bounds = this.tileSet.getBounds()
    const otherBounds = other.tileSet.getBounds()
    return !(bounds[1] > otherBounds[3] || bounds[3] < otherBounds[1] || bounds[2] < otherBounds[0] || bounds[0] > otherBounds[2])
  }

  isRequired () {
    return this.required
  }

  addLayer (layer) {
    if (this.layers.indexOf(layer) === -1) {
      this.layers.push(layer)
      this.layers.sort((a, b) => a - b)
    }
  }

  getTileSetOverlap (other) {
    return this.tileSet.getOverlap(other.tileSet)
  }

  layersMatch (other) {
    return isEqual(this.layers, other.layers)
  }

  hasLayersInCommon (other) {
    return intersection(this.layers, other.layers).length > 0
  }

  isSubsetOf (other) {
    return this.layers.filter(layer => other.layers.indexOf(layer) === -1).length === 0
  }
}

/**
 * A TileSet, represented by an inclusive range of x/y tiles
 */
class TileSet {
  constructor (x1, x2, y1, y2, zoom) {
    this.x1 = x1
    this.x2 = x2
    this.y1 = y1
    this.y2 = y2
    this.zoom = zoom
  }

  toString () {
    return this.zoom + ': ' + [[this.x1, this.x2].join(' - '), [this.y1, this.y2].join(' - ')].join(', ')
  }

  getBounds () {
    const llBounds = tileBboxCalculator(this.x1, this.y1, this.zoom)
    const urBounds = tileBboxCalculator(this.x2, this.y2, this.zoom)
    return [llBounds.west, llBounds.south, urBounds.east, urBounds.north]
  }

  /**
   * Gets the tile set at the next zoom level
   * @return {TileSet}
   */
  getTileSetAtNextZoom () {
    const x1 = this.x1 * 2
    const x2 = this.x2 * 2 + 1
    const y1 = this.y1 * 2
    const y2 = this.y2 * 2 + 1
    const zoom = this.zoom + 1
    return new TileSet(x1, x2, y1, y2, zoom)
  }

  /**
   * Gets the tile set at the next zoom level
   * @return {TileSet}
   */
  getTileSetAtPreviousZoom () {
    let tileSet = null
    // trim tile set to only represent full tiles (no half tiles)
    let x1 = this.x1 % 2 === 1 ? this.x1 + 1 : this.x1
    let y1 = this.y1 % 2 === 1 ? this.y1 + 1 : this.y1
    let x2 = this.x2 % 2 === 0 ? this.x2 - 1 : this.x2
    let y2 = this.y2 % 2 === 0 ? this.y2 - 1 : this.y2

    // if x range and y range are greater than 1 (i.e. at least 2 tiles)
    if (x2 - x1 >= 1 && y2 - y1 >= 1) {
      x1 = Math.ceil(x1 / 2.0)
      x2 = Math.floor(x2 / 2.0)
      y1 = Math.ceil(y1 / 2.0)
      y2 = Math.floor(y2 / 2.0)
      const zoom = this.zoom - 1
      tileSet = new TileSet(x1, x2, y1, y2, zoom)
    }
    return tileSet
  }

  /**
   * Checks if this tile set is adjacent with the other
   * @param other
   * @return {boolean}
   */
  isAdjacentWith (other) {
    return (this.x1 === other.x1 && this.x2 === other.x2 && (Math.abs(this.y2 - other.y1) === 1 || Math.abs(other.y2 - this.y1) === 1)) ||
      (this.y1 === other.y1 && this.y2 === other.y2 && (Math.abs(this.x2 - other.x1) === 1 || Math.abs(other.x2 - this.x1) === 1))
  }

  /**
   * Merges the other tileset into this one, note the other tile set must be adjacent
   * @param other
   */
  merge (other) {
    if (this.zoom === other.zoom) {
      this.x1 = Math.min(this.x1, other.x1)
      this.x2 = Math.max(this.x2, other.x2)
      this.y1 = Math.min(this.y1, other.y1)
      this.y2 = Math.max(this.y2, other.y2)
    }
  }

  /**
   * Returns the number of tiles in the set
   * @return {number}
   */
  tilesInSet () {
    return (this.x2 - this.x1 + 1) * (this.y2 - this.y1 + 1)
  }

  /**
   * Equals another tile set if they represent the same range
   * @param other
   * @return {boolean}
   */
  isEqualWith (other) {
    return this.x1 === other.x1 && this.x2 === other.x2 && this.y1 === other.y1 && this.y2 === other.y2 && this.zoom === other.zoom
  }

  /**
   * Checks if there is any overlap between tile sets (note, if they share an edge, they overlap)
   * @param other
   * @return {boolean}
   */
  overlapsWith (other) {
    return !(this.y1 > other.y2 || this.y2 < other.y1 || this.x2 < other.x1 || this.x1 > other.x2)
  }

  /**
   * Gets the overlapping tile set between two rectangles
   * @param other
   * @return {TileSet|null}
   */
  getOverlap (other) {
    const x1 = Math.max(this.x1, other.x1)
    const x2 = Math.min(this.x2, other.x2)
    if (x2 < x1) {
      return null
    }

    const y1 = Math.max(this.y1, other.y1)
    const y2 = Math.min(this.y2, other.y2)
    if (y2 < y1) {
      return null
    }

    return new TileSet(x1, x2, y1, y2, this.zoom)
  }

  /**
   * Splits two rectangles into overlapping parts, non-overlapping parts from the first rectangle, and non-overlapping parts from the second rectangle
   * @param other - must be a rectangle that overlaps but is not equal with
   * @param overlap (overlapping region, if null it will be calculated)
   * @return {{overlap: *[], nonOverlapA: *[], nonOverlapB: *[]}|null}
   */
  splitWith (other, overlap) {
    const split = {
      overlap: [overlap],
      nonOverlapA: [],
      nonOverlapB: []
    }

    const xSections = []
    const minX = Math.min(this.x1, other.x1)
    const maxX = Math.max(this.x2, other.x2)
    if (minX < overlap.x1) {
      xSections.push([minX, overlap.x1 - 1])
    }
    xSections.push([overlap.x1, overlap.x2])
    if (maxX > overlap.x2) {
      xSections.push([overlap.x2 + 1, maxX])
    }

    const ySections = []
    const minY = Math.min(this.y1, other.y1)
    const maxY = Math.max(this.y2, other.y2)
    if (minY < overlap.y1) {
      ySections.push([minY, overlap.y1 - 1])
    }
    ySections.push([overlap.y1, overlap.y2])
    if (maxY > overlap.y2) {
      ySections.push([overlap.y2 + 1, maxY])
    }

    for (let i = 0; i < xSections.length; i++) {
      const xRange = xSections[i]
      for (let j = 0; j < ySections.length; j++) {
        const yRange = ySections[j]
        const tileSetToAdd = new TileSet(xRange[0], xRange[1], yRange[0], yRange[1], this.zoom)
        const overlapsThis = tileSetToAdd.overlapsWith(this)
        const overlapsOther = tileSetToAdd.overlapsWith(other)

        const array = overlapsThis && overlapsOther ? null : (overlapsThis ? split.nonOverlapA : (overlapsOther ? split.nonOverlapB : null))
        if (!isNil(array)) {
          let merged = false
          for (let k = 0; k < array.length && !merged; k++) {
            const tileSetToCompare = array[k]
            if (tileSetToAdd.isAdjacentWith(tileSetToCompare)) {
              tileSetToCompare.merge(tileSetToAdd)
              merged = true
            } else if (tileSetToAdd.isEqualWith(tileSetToCompare)) {
              merged = true
            }
          }
          if (!merged) {
            array.push(tileSetToAdd)
          }
        }
      }
    }
    return split
  }
}

/**
 * Gets count of a tile matrix
 * @param matrices
 * @return {number}
 */
function getZoomTileMatrixCount (matrices) {
  let count = 0
  keys(matrices).forEach(matrix => {
    matrices[matrix].forEach(tileSet => {
      // console.log(tileSet.tileSet.toString() + ': [layers: ' + tileSet.layers.length + ', count: ' + tileSet.tileSet.tilesInSet() + ']')
      count += tileSet.tileSet.tilesInSet()
    })
  })
  return count
}

function getTileSetForExtent (zoom, extent, drawOverlap = null) {
  // reduce the extent just in case it lies on a tile boundary
  const epsilon = 0.00000001
  const epsilonReducedExtent = [extent[0] + epsilon, extent[1] + epsilon, extent[2] - epsilon, extent[3] - epsilon]
  let x = calculateXTileRangeForExtent(epsilonReducedExtent, zoom)
  let y = calculateYTileRangeForExtent(epsilonReducedExtent, zoom)

  if (!isNil(drawOverlap)) {
    const lowerLeftBounds = tileBboxCalculator(x.min, y.min, zoom)
    const upperRightBounds = tileBboxCalculator(x.max, y.max, zoom)

    const pixelWidthInDegrees = (lowerLeftBounds.east - lowerLeftBounds.west) / 256.0
    const upperPixelHeightInDegrees = (upperRightBounds.north - upperRightBounds.south) / 256.0
    const lowerPixelHeightInDegrees = (lowerLeftBounds.north - lowerLeftBounds.south) / 256.0
    extent[0] = Math.max(-180.0, extent[0] - pixelWidthInDegrees * drawOverlap.width)
    extent[1] = Math.max(-85.051128, extent[1] - lowerPixelHeightInDegrees * drawOverlap.height)
    extent[2] = Math.min(180.0, extent[2] + pixelWidthInDegrees * drawOverlap.width)
    extent[3] = Math.min(85.051128, extent[3] + upperPixelHeightInDegrees * drawOverlap.height)
    x = calculateXTileRangeForExtent(extent, zoom)
    y = calculateYTileRangeForExtent(extent, zoom)
  }
  return new TileSet(x.min, x.max, y.min, y.max, zoom)

}

/**
 * Get the tile matrix for these layers and zoom levels
 * @param filteredExtents
 * @param minZoom
 * @param maxZoom
 * @return {{}}
 */
function getZoomTileMatrix (filteredExtents, minZoom = 0, maxZoom = 20) {
  const matrices = {}
  if (filteredExtents.length !== 0) {
    for (let z = minZoom; z <= maxZoom; z++) {
      matrices[z] = []

      // iterate over each layer
      filteredExtents.filter(data => data.minZoom <= z && data.maxZoom >= z).forEach(layer => {

        let entriesToCheck = [new LayerTileSet(getTileSetForExtent(z, layer.extent.slice(), layer.drawOverlap), [layer.id])]

        for (let i = 0; i < entriesToCheck.length; i++) {
          let entryToCheck = entriesToCheck[i]
          let found = false

          // compare entryToCheck against existing entries
          for (let j = 0; j < matrices[z].length && !found; j++) {
            const existingEntry = matrices[z][j]
            // found an exact match, i can stop now
            if (entryToCheck.tileSet.isEqualWith(existingEntry.tileSet)) {
              existingEntry.addLayer(layer.id)
              found = true
            } else {
              const overlap = entryToCheck.tileSet.getOverlap(existingEntry.tileSet)
              if (!isNil(overlap)) {
                const {nonOverlapA, nonOverlapB} = entryToCheck.tileSet.splitWith(existingEntry.tileSet, overlap)

                const entriesToAdd = [new LayerTileSet(overlap, existingEntry.layers.concat(entryToCheck.layers))]
                nonOverlapB.forEach(tileSet => {
                  entriesToAdd.push(new LayerTileSet(tileSet, existingEntry.layers))
                })

                // replace the existing entry with the overlap + non overlapping part of the existing entry
                matrices[z].splice(j, 1, ...entriesToAdd)

                // add any non overlapping parts from the entry to check, they will get looked at next
                nonOverlapA.forEach(tileSet => {
                  entriesToCheck.push(new LayerTileSet(tileSet, entryToCheck.layers))
                })
                found = true
              }
            }
          }

          // not found among existing entries, add as it's own entry
          if (!found) {
            matrices[z].push(entryToCheck)
          }
        }
      })
    }
  }
  return matrices
}

/**
 * Applies the tile scaling method to the zoom tile matrix, reducing the overall tile set
 * Rules:
 * 1. Do not remove a tile set if at the next zoom (from which it would be scaled) there is a missing layer
 * 2. Do not remove a tile set if at the next zoom (from which it would be scaled) there is an additional layer
 * 3. If these conditions pass, if a tile set is not already used to scale another zoom's tile set, it can be removed if it has any layers in common with a previous zoom's tile set
 * @param zoomTileMatrix
 */
function applyTileScalingToZoomTileMatrix (zoomTileMatrix) {
  let matrixZoomLevels = keys(zoomTileMatrix).sort((a, b) => b - a)
  for (let i = 0; i < matrixZoomLevels.length; i++) {
    const zoom = matrixZoomLevels[i]
    const prevZoom = matrixZoomLevels[i + 1]

    if (Math.abs(zoom - prevZoom) === 1) {
      const zoomTileSets = zoomTileMatrix[zoom]
      const prevZoomTileSets = zoomTileMatrix[prevZoom]
      const layersInZoomLevel = sortedUniq(zoomTileSets.flatMap(layerTileSet => layerTileSet.layers))
      const layersInPrevZoomLevel = sortedUniq(prevZoomTileSets.flatMap(layerTileSet => layerTileSet.layers))
      const layersOnlyInPrevZoomLevel = difference(layersInPrevZoomLevel, layersInZoomLevel)
      const layersOnlyInZoomLevel = difference(layersInZoomLevel, layersInPrevZoomLevel)
      // iterate over the tile sets for the highest zoom level
      const zoomTileSetsRemoved = []
      for (let j = 0; j < zoomTileSets.length; j++) {
        const zoomTileSet = zoomTileSets[j]
        // if this tile set is being used to scale already, it can't be removed
        if (!zoomTileSet.isRequired()) {
          let tileSetCovered = false
          // iterate over previous zoom's tile sets
          for (let k = 0; k < prevZoomTileSets.length; k++) {
            const prevZoomTileSet = prevZoomTileSets[k]
            const layersDroppingOffAtNextZoom = zoomTileSet.layers.find(layer => layersOnlyInZoomLevel.indexOf(layer) !== -1) != null
            if (!layersDroppingOffAtNextZoom && zoomTileSet.hasLayersInCommon(prevZoomTileSet) && intersection(prevZoomTileSet.layers, layersOnlyInPrevZoomLevel).length === 0) {
              tileSetCovered = true
              prevZoomTileSet.required = true
            }
          }
          if (tileSetCovered) {
            zoomTileSetsRemoved.push(zoomTileSet)
            zoomTileSets.splice(j, 1)
            j--
          }
        }
      }
      if (zoomTileSets.length > 0) {
        const tileSetsToAddBackIn = zoomTileSetsRemoved.filter(removedTileSet => zoomTileSets.findIndex(zoomTileSet => zoomTileSet.tileSet.isAdjacentWith(removedTileSet.tileSet) && zoomTileSet.hasLayersInCommon(removedTileSet)) !== -1)
        tileSetsToAddBackIn.forEach(tileSet => {
          zoomTileMatrix[zoom].push(tileSet)
        })
      }
    }
  }
}

/**
 * Determines intersection of two extents
 * @param extentA
 * @param extentB
 * @return {null|number[]}
 */
function extentIntersection (extentA, extentB) {
  const x1 = Math.max(extentA[0], extentB[0])
  const x2 = Math.min(extentA[2], extentB[2])
  if (x2 < x1) {
    return null
  }
  const y1 = Math.max(extentA[1], extentB[1])
  const y2 = Math.min(extentA[3], extentB[3])
  if (y2 < y1) {
    return null
  }
  return [x1, y1, x2, y2]
}

/**
 * Iterates over the tiles in a matrix
 * @param tileMatrix
 * @param tileCallback
 * @return {Promise<void>}
 */
async function iterateTilesInMatrix (tileMatrix, tileCallback) {
  const zoomLevels = keys(tileMatrix).sort((a, b) => a - b)
  let stop = false
  for (let i = 0; i < zoomLevels.length && !stop; i++) {
    let z = zoomLevels[i]
    const tileSets = tileMatrix[z]
    for (let j = 0; j < tileSets.length; j++) {
      const tileSet = tileSets[j].tileSet
      const layers = tileSets[j].layers
      for (let x = tileSet.x1; x <= tileSet.x2 && !stop; x++) {
        for (let y = tileSet.y1; y <= tileSet.y2 && !stop; y++) {
          stop = await tileCallback(z, x, y, layers)
        }
      }
    }
  }
}

/**
 * Gets the tile matrix for this configuration
 * @param boundingBoxFilter
 * @param dataSources
 * @param geopackageLayers
 * @param tileScalingEnabled
 * @param minZoom
 * @param maxZoom
 * @return {*}
 */
function getTileMatrix (boundingBoxFilter, dataSources, geopackageLayers, tileScalingEnabled = false, minZoom = 0, maxZoom = 20) {
  let zoomTileMatrix = {}
  if (!isNil(minZoom) && !isNil(maxZoom) && !isNil(boundingBoxFilter)) {
    const trimmedBoundingBoxFilter = trimExtentToWebMercatorMax(boundingBoxFilter)
    // filtered extents represents the bounding box
    let filteredExtents = dataSources.map(dataSource => {
      return {
        id: dataSource.id,
        drawOverlap: dataSource.drawOverlap,
        extent: extentIntersection(dataSource.extent, trimmedBoundingBoxFilter),
        minZoom: dataSource.minZoom || 0,
        maxZoom: dataSource.maxZoom || 20
      }
    }).filter(data => data.extent != null)
    filteredExtents = filteredExtents.concat(geopackageLayers.map(geopackageLayer => {
      let data
      if (geopackageLayer.type === 'feature') {
        data = {
          id: geopackageLayer.geopackage.id + '_' + geopackageLayer.table,
          drawOverlap: geopackageLayer.drawOverlap,
          extent: extentIntersection(geopackageLayer.geopackage.tables.features[geopackageLayer.table].extent, trimmedBoundingBoxFilter),
          minZoom: 0,
          maxZoom: 20
        }
      } else {
        data = {
          id: geopackageLayer.geopackage.id + '_' + geopackageLayer.table,
          extent: extentIntersection(geopackageLayer.geopackage.tables.tiles[geopackageLayer.table].extent, trimmedBoundingBoxFilter),
          minZoom: geopackageLayer.geopackage.tables.tiles[geopackageLayer.table].minZoom || 0,
          maxZoom: geopackageLayer.geopackage.tables.tiles[geopackageLayer.table].maxZoom || 20
        }
      }
      return data
    }).filter(data => data.extent != null))
    zoomTileMatrix = getZoomTileMatrix(filteredExtents, minZoom, maxZoom)
    if (tileScalingEnabled) {
      applyTileScalingToZoomTileMatrix(zoomTileMatrix)
    }
  }
  return zoomTileMatrix
}

/**
 * Returns the tile count for this configuration
 * @param boundingBoxFilter
 * @param dataSources
 * @param geopackageLayers
 * @param tileScalingEnabled
 * @param minZoom
 * @param maxZoom
 * @return {number}
 */
function getTileCount (boundingBoxFilter, dataSources, geopackageLayers, tileScalingEnabled, minZoom = 0, maxZoom = 20) {
  return getZoomTileMatrixCount(getTileMatrix(boundingBoxFilter, dataSources, geopackageLayers, tileScalingEnabled, minZoom, maxZoom))
}

export {
  getZoomTileMatrixCount,
  getZoomTileMatrix,
  getTileCount,
  getTileMatrix,
  iterateTilesInMatrix
}
