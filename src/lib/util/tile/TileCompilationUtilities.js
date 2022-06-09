import { createCanvas, disposeCanvas, disposeImage, makeImage, makeImageData } from '../canvas/CanvasUtilities'
import { reproject } from '../../projection/ReprojectionUtilities'
import { epsgMatches } from '../../projection/ProjectionUtilities'
import groupBy from 'lodash/groupBy'
import { extentIntersection } from './TileUtilities'

/**
 * Handles a reprojection request
 * @param data
 * @returns {ArrayBufferLike}
 */
async function reprojectTile (data) {
  const { targetWidth, targetHeight } = data
  const canvas = createCanvas(targetWidth, targetHeight)
  const imageData = makeImageData(targetWidth, targetHeight)
  await reproject(data, imageData)
  canvas.getContext('2d').putImageData(imageData, 0, 0)
  const result = canvas.toDataURL()
  disposeCanvas(canvas)
  return result
}

/**
 * Returns an image after compiling all the tiles for a given srs
 * @param tiles
 * @param size
 * @param sourceSrs
 * @param targetSrs
 * @param targetBounds
 * @param clippingRegion
 * @param canvas
 * @returns {Promise<HTMLImageElement | SVGImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap>}
 */
async function compileTileImage (tiles, size, sourceSrs, targetSrs, targetBounds, clippingRegion, canvas) {
  const sourceBounds = tiles[0].imageBounds
  let dataUrl = await stitchTileData(canvas, tiles, size, sourceBounds)
  // check if this tile needs reprojected
  if (!epsgMatches(targetSrs, sourceSrs)) {
    dataUrl = await reprojectTile({
      sourceTile: dataUrl,
      sourceBoundingBox: {
        minLon: sourceBounds[0],
        minLat: sourceBounds[1],
        maxLon: sourceBounds[2],
        maxLat: sourceBounds[3]
      },
      sourceSrs: sourceSrs,
      targetSrs: targetSrs,
      targetWidth: size.x,
      targetHeight: size.y,
      targetBoundingBox: targetBounds
    })
  }
  dataUrl = await clipImage(canvas, dataUrl, clippingRegion, size)
  return makeImage(dataUrl)
}

/**
 * Handles a tile compilation request (i.e. multiple tiles, possibly in a different projection, needed to create the target tile)
 * @param data
 * @returns {Promise<string>}
 *
 */
async function compileTiles (data) {
  const { tiles, size, clippingRegion, targetSrs, targetBounds } = data
  const canvas = createCanvas(size.x, size.y)
  const context = canvas.getContext('2d')
  const srsTilesMap = groupBy(tiles, tile => tile.tileSRS)
  const promises = Object.keys(srsTilesMap).map(sourceSrs => {
    const tilesForSrs = srsTilesMap[sourceSrs]
    return compileTileImage(tilesForSrs, size, sourceSrs, targetSrs, targetBounds, clippingRegion, canvas)
  })
  const results = await Promise.allSettled(promises)
  context.clearRect(0, 0, size.x, size.y)
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      const image = result.value
      context.drawImage(image, 0, 0, size.x, size.y)
      disposeImage(image)
    }
  })
  const result = canvas.toDataURL()
  disposeCanvas(canvas)
  return result
}

async function drawInCanvas (context, dataUrl, sx, sy, sw, sh, dx, dy, dw, dh) {
  try {
    const image = await makeImage(dataUrl)
    context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
    disposeImage(image)
    // eslint-disable-next-line no-empty, no-unused-vars
  } catch (e) {
  }
}

/**
 * Handles stitching together an image from a matrix of tiles
 * @param canvas
 * @param tiles
 * @param targetSize
 * @param targetExtent
 */
async function stitchTileData (canvas, tiles, targetSize, targetExtent) {
  if (tiles.length === 0) {
    return null
  }

  const targetUnitsWidth = targetExtent[2] - targetExtent[0]
  const targetUnitsHeight = targetExtent[3] - targetExtent[1]
  const targetUnitsPerPixel = {
    x: targetSize.x / targetUnitsWidth,
    y: targetSize.y / targetUnitsHeight
  }

  const context = canvas.getContext('2d')
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]
    const srcExtent = tile.tileBounds

    const intersection = extentIntersection(srcExtent, targetExtent)
    if (intersection != null) {
      const srcUnitsWidth = srcExtent[2] - srcExtent[0]
      const srcUnitsHeight = srcExtent[3] - srcExtent[1]
      const srcUnitsPerPixel = {
        x: tile.width / srcUnitsWidth,
        y: tile.height / srcUnitsHeight
      }

      const sx = Math.max(0, Math.min(tile.width, Math.round(srcUnitsPerPixel.x * (intersection[0] - srcExtent[0]))))
      const sy = Math.max(0, Math.min(tile.height, Math.round(srcUnitsPerPixel.y * (srcExtent[3] - intersection[3]))))
      const sw = Math.max(0, Math.min(tile.width, Math.round((srcUnitsPerPixel.x * (intersection[2] - srcExtent[0])) - sx)))
      const sh = Math.max(0, Math.min(tile.height, Math.round(srcUnitsPerPixel.y * (srcExtent[3] - intersection[1]) - sy)))

      const dx = Math.max(0, Math.min(targetSize.x, Math.round(targetUnitsPerPixel.x * (intersection[0] - targetExtent[0]))))
      const dy = Math.max(0, Math.min(targetSize.y, Math.round(targetUnitsPerPixel.y * (targetExtent[3] - intersection[3]))))
      const dw = Math.max(0, Math.min(targetSize.x, Math.round((targetUnitsPerPixel.x * (intersection[2] - targetExtent[0])) - dx)))
      const dh = Math.max(0, Math.min(targetSize.y, Math.round(targetUnitsPerPixel.y * (targetExtent[3] - intersection[1]) - dy)))

      await drawInCanvas(context, tile.dataUrl, sx, sy, sw, sh, dx, dy, dw, dh)
    }
  }
  const dataUrl = canvas.toDataURL()
  context.clearRect(0, 0, targetSize.x, targetSize.y)
  return dataUrl
}


/**
 * Applies the clipping region to the canvas context, prior to drawing the image
 * @param ctx
 * @param clippingRegion
 * @param size
 */
function clipContextToExtent (ctx, clippingRegion, size) {
  const {
    intersection,
    tileBounds,
    tileHeight,
    tileWidth
  } = clippingRegion

  const getX = (lng, mathFunc) => {
    return mathFunc(size.x / tileWidth * (lng - tileBounds.minLongitude))
  }
  const getY = (lat, mathFunc) => {
    return mathFunc(size.y / tileHeight * (tileBounds.maxLatitude - lat))
  }

  const minX = Math.max(0, getX(intersection.minLongitude, Math.floor) - 1)
  const maxX = Math.min(size.x, getX(intersection.maxLongitude, Math.ceil) + 1)
  const minY = Math.max(0, getY(intersection.maxLatitude, Math.ceil) - 1)
  const maxY = Math.min(size.y, getY(intersection.minLatitude, Math.floor) + 1)
  ctx.beginPath()
  ctx.rect(minX, minY, maxX - minX, maxY - minY)
  ctx.clip()
}

/**
 * Handle clipping an image
 * @param canvas
 * @param dataUrl
 * @param clippingRegion
 * @param size
 * @return {Promise<unknown>}
 */
async function clipImage (canvas, dataUrl, clippingRegion, size) {
  if (clippingRegion != null && clippingRegion.intersection != null) {
    const image = await makeImage(dataUrl)
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, size.x, size.y)
    clipContextToExtent(ctx, clippingRegion, size)
    ctx.drawImage(image, 0, 0)
    disposeImage(image)
    return canvas.toDataURL()
  } else {
    return dataUrl
  }
}

export {
  reprojectTile,
  compileTileImage,
  compileTiles,
  clipImage,
  drawInCanvas,
  stitchTileData,
}