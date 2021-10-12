import { getConverter } from './ProjectionUtilities'
import { disposeImage, makeImage, readPixels } from '../util/canvas/CanvasUtilities'

/**
 * Handles the reprojection of a source image into imageDta
 * @param data
 * @param imageData
 * @returns {ArrayBufferLike}
 */
async function reproject (data, imageData) {
  const { sourceSrs, sourceTile, sourceBoundingBox, targetSrs, targetBoundingBox, targetWidth, targetHeight } = data
  const srcImage = await makeImage(sourceTile)
  const srcWidth = srcImage.width()
  const srcHeight = srcImage.height()

  const srcPixelSize = {
    width: (sourceBoundingBox.maxLon - sourceBoundingBox.minLon) / srcWidth,
    height: (sourceBoundingBox.maxLat - sourceBoundingBox.minLat) / srcHeight
  }

  const targetPixelSize = {
    width: (targetBoundingBox.maxLon - targetBoundingBox.minLon) / targetWidth,
    height: (targetBoundingBox.maxLat - targetBoundingBox.minLat) / targetHeight
  }

  const targetImageData = imageData.data
  const sourceImageData = readPixels(srcImage)
  const conversion = getConverter(targetSrs, sourceSrs)

  let latitude
  for (let row = 0; row < targetHeight; row++) {
    latitude = targetBoundingBox.maxLat - row * targetPixelSize.height
    for (let column = 0; column < targetWidth; column++) {
      const longitude = targetBoundingBox.minLon + column * targetPixelSize.width
      const projected = conversion.forward([longitude, latitude])
      let xPixel = srcWidth - Math.round((sourceBoundingBox.maxLon - projected[0]) / srcPixelSize.width)
      let yPixel = Math.round((sourceBoundingBox.maxLat - projected[1]) / srcPixelSize.height)

      xPixel = Math.max(0, xPixel)
      xPixel = Math.min(srcWidth - 1, xPixel)

      yPixel = Math.max(0, yPixel)
      yPixel = Math.min(srcHeight - 1, yPixel)

      const sliceStart = yPixel * srcWidth * 4 + xPixel * 4
      targetImageData.set(sourceImageData.slice(sliceStart, sliceStart + 4), row * targetWidth * 4 + column * 4)
    }
  }
  disposeImage(srcImage)
}

export {
  reproject
}
