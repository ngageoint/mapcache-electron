import fs from 'fs'
import isNil from 'lodash/isNil'
import bbox from '@turf/bbox'
import bboxPolygon from '@turf/bbox-polygon'
import intersect from '@turf/intersect'
import jimp from './JimpUtilities'
import ProjectionUtilities from '../projection/ProjectionUtilities'
import TileBoundingBoxUtils from './TileBoundingBoxUtils'
import XYZTileUtilities from './XYZTileUtilities'
import GeoTiffUtilities from './GeoTiffUtilities'

const maxByteValue = 255

export default class GeoTiffRenderingUtilities {

  /**
   * Requests a tile from the decompressed binary data file representing a geotiff
   * @param tileRequest
   * @returns {Promise<any>}
   */
  static requestTile (tileRequest) {
    return new Promise ((resolve, reject) => {
      const {
        rasterFile,
        redBand,
        redBandMin,
        redBandMax,
        greenBand,
        greenBandMin,
        greenBandMax,
        blueBand,
        blueBandMin,
        blueBandMax,
        grayBand,
        grayBandMin,
        grayBandMax,
        alphaBand,
        renderingMethod,
        bitsPerSample,
        extent,
        imageWidth,
        stretchToMinMax,
        globalNoDataValue,
        bytesPerSample,
        sampleFormat,
        grayScaleColorGradient,
        enableGlobalNoDataValue,
        littleEndian,
        colorMap,
        paletteBand,
        srs,
        width,
        height,
        imageOrigin,
        imageResolution,
        coords
      } = tileRequest

      const {x, y, z} = coords

      const fd = fs.openSync(rasterFile, 'r')
      const size = fs.statSync(rasterFile).size

      // create an image to store
      try {
        new jimp(width, height, 0x0, (err, image) => {
          try {
            let targetData = image.bitmap.data
            let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
            let tileUpperRightBuffered = ProjectionUtilities.wgs84ToWebMercator.inverse([tileBbox.maxLon + (tileBbox.maxLon - tileBbox.minLon), tileBbox.maxLat + (tileBbox.maxLat - tileBbox.minLat)])
            let tileLowerLeftBuffered = ProjectionUtilities.wgs84ToWebMercator.inverse([tileBbox.minLon - (tileBbox.maxLon - tileBbox.minLon), tileBbox.minLat - (tileBbox.maxLat - tileBbox.minLat)])
            const fullExtent = XYZTileUtilities.trimExtentToWebMercatorMax(extent)

            // if layer does not overlap with tile request, return an empty tile
            if (TileBoundingBoxUtils.tileIntersects(tileUpperRightBuffered, tileLowerLeftBuffered, [fullExtent[2], fullExtent[3]], [fullExtent[0], fullExtent[1]])) {
              const transform = ProjectionUtilities.getConverter('EPSG:' + srs, 'EPSG:3857')
              const ur = ProjectionUtilities.wgs84ToWebMercator.forward([fullExtent[2], fullExtent[3]])
              const ll = ProjectionUtilities.wgs84ToWebMercator.forward([fullExtent[0], fullExtent[1]])

              // get intersection of request and source data, this is in 3857
              const intersection = intersect(bboxPolygon([ll[0], ll[1], ur[0], ur[1]]), bboxPolygon([tileBbox.minLon, tileBbox.minLat, tileBbox.maxLon, tileBbox.maxLat]))

              if (!isNil(intersection)) {
                const reader = GeoTiffUtilities.getReaderForSample(0, sampleFormat, bitsPerSample[0])
                const intersectionBbox = bbox(intersection)

                // determine tx, ty
                const tx = (tileBbox.maxLon - tileBbox.minLon) / width
                const ty = (tileBbox.maxLat - tileBbox.minLat) / height

                // determine pixel range
                const xMin = Math.max(Math.round((intersectionBbox[0] - tileBbox.minLon) / tx))
                const xMax = Math.min(width - 1, Math.round((intersectionBbox[2] - tileBbox.minLon) / tx))
                const yMin = Math.max(0, Math.round((intersectionBbox[1] - tileBbox.minLat) / ty))
                const yMax = Math.min(height, Math.round((intersectionBbox[3] - tileBbox.minLat) / ty))

                const x0 = imageOrigin[0]
                const y0 = imageOrigin[1]
                const dx = imageResolution[0]
                const dy = imageResolution[1]

                if (renderingMethod === 0) {
                  // gray rendering (either whiteIsZero or blackIsZero
                  if (grayBand > 0) {
                    const g = (sample) => sample[grayBand - 1]
                    let a
                    if (alphaBand > 0) {
                      a = (sample) => sample[grayBand - 1]
                    }
                    let grayBandDataTypeMax = GeoTiffUtilities.getMaxForDataType(bitsPerSample[grayBand])
                    // iterate over each pixel, and based on method, utilize rendering
                    for (let xPos = xMin; xPos <= xMax; xPos++) {
                      const longitude = tileBbox.minLon + tx * xPos
                      for (let yPos = yMin; yPos <= yMax; yPos++) {
                        const latitude = tileBbox.minLat + ty * yPos
                        const coordinate = transform.inverse([longitude, latitude])
                        const px = Math.round((coordinate[0] - x0) / dx)
                        const py = Math.round((coordinate[1] - y0) / dy)
                        const sourcePosition = imageWidth * py + px
                        const offset = bytesPerSample * sourcePosition
                        if (offset >= 0 && offset < size) {
                          const sample = GeoTiffUtilities.getSample(fd, offset, bytesPerSample, bitsPerSample, reader, littleEndian)
                          let value = g(sample)
                          if (stretchToMinMax) {
                            value = GeoTiffUtilities.stretchValue(value, grayBandMin, grayBandMax)
                          } else {
                            value = value / grayBandDataTypeMax * maxByteValue
                          }
                          if (grayScaleColorGradient === 0) {
                            value = maxByteValue - value
                          }
                          const position = 4 * (width * (height - yPos) + xPos)
                          targetData[position] = value
                          targetData[position + 1] = value
                          targetData[position + 2] = value
                          if (a) {
                            targetData[position + 3] = a(sample)
                          } else {
                            targetData[position + 3] = 255
                          }
                          if (targetData[position + 3] !== 0) {
                            // alpha was good, check if it is a no data though...
                            if (enableGlobalNoDataValue && targetData[position] === globalNoDataValue) {
                              targetData[position + 3] = 0
                            }
                          }
                        }
                      }
                    }
                  }
                } else if (renderingMethod === 1) {
                  // RGB rendering
                  let r, g, b, a
                  let redBandDataTypeMax = maxByteValue
                  let greenBandDataTypeMax = maxByteValue
                  let blueBandDataTypeMax = maxByteValue

                  if (redBand > 0) {
                    redBandDataTypeMax = GeoTiffUtilities.getMaxForDataType(bitsPerSample[redBand - 1])
                    r = (sample) => sample[redBand - 1]
                  }
                  if (greenBand > 0) {
                    greenBandDataTypeMax = GeoTiffUtilities.getMaxForDataType(bitsPerSample[greenBand - 1])
                    g = (sample) => sample[greenBand - 1]
                  }
                  if (blueBand > 0) {
                    blueBandDataTypeMax = GeoTiffUtilities.getMaxForDataType(bitsPerSample[blueBand - 1])
                    b = (sample) => sample[blueBand - 1]
                  }
                  if (alphaBand > 0) {
                    a = (sample) => sample[alphaBand - 1]
                  }

                  for (let xPos = xMin; xPos <= xMax; xPos++) {
                    const longitude = tileBbox.minLon + tx * xPos
                    for (let yPos = yMin; yPos <= yMax; yPos++) {
                      const latitude = tileBbox.minLat + ty * yPos
                      const coordinate = transform.inverse([longitude, latitude])
                      const px = Math.round((coordinate[0] - x0) / dx)
                      const py = Math.round((coordinate[1] - y0) / dy)
                      const position = 4 * (width * (height - yPos) + xPos)
                      const sourcePosition = imageWidth * py + px
                      const offset = bytesPerSample * sourcePosition
                      if (offset >= 0 && offset < size) {
                        const sample = GeoTiffUtilities.getSample(fd, offset, bytesPerSample, bitsPerSample, reader, littleEndian)

                        // set value on target here
                        if (!isNil(r)) {
                          targetData[position] = stretchToMinMax ? GeoTiffUtilities.stretchValue(r(sample), redBandMin, redBandMax) : r(sample) / redBandDataTypeMax * maxByteValue
                        } else {
                          targetData[position] = 0
                        }
                        if (!isNil(g)) {
                          targetData[position + 1] = stretchToMinMax ? GeoTiffUtilities.stretchValue(g(sample), greenBandMin, greenBandMax) : g(sample) / greenBandDataTypeMax * maxByteValue
                        } else {
                          targetData[position + 1] = 0
                        }
                        if (!isNil(b)) {
                          targetData[position + 2] = stretchToMinMax ? GeoTiffUtilities.stretchValue(b(sample), blueBandMin, blueBandMax) : b(sample) / blueBandDataTypeMax * maxByteValue
                        } else {
                          targetData[position + 2] = 0
                        }
                        if (!isNil(a)) {
                          targetData[position + 3] = a(sample)
                        } else {
                          targetData[position + 3] = 255
                        }
                        if (targetData[position + 3] !== 0) {
                          if (enableGlobalNoDataValue && targetData[position] === globalNoDataValue && targetData[(position) + 1] === globalNoDataValue && targetData[(position) + 2] === globalNoDataValue) {
                            targetData[position + 3] = 0
                          }
                        }
                      }
                    }
                  }
                } else if (renderingMethod === 2) {
                  // Palette rendering
                  if (paletteBand > 0) {
                    let p = (sample) => sample[paletteBand - 1]
                    let a
                    if (alphaBand > 0) {
                      a = (sample) => sample[alphaBand - 1]
                    }
                    for (let x = xMin; x <= xMax; x++) {
                      const longitude = tileBbox.minLon + tx * x
                      for (let y = yMin; y <= yMax; y++) {
                        const latitude = tileBbox.minLat + ty * y
                        const coordinate = transform.inverse([longitude, latitude])
                        const px = Math.round((coordinate[0] - x0) / dx)
                        const py = Math.round((coordinate[1] - y0) / dy)
                        const position = 4 * (width * (height - y) + x)
                        const sourcePosition = imageWidth * py + px
                        const offset = bytesPerSample * sourcePosition
                        if (offset >= 0 && offset < size) {
                          const sample = GeoTiffUtilities.getSample(fd, offset, bytesPerSample, bitsPerSample, reader, littleEndian)
                          const mapIndex = p(sample)
                          targetData[position] = colorMap[mapIndex] / 65535 * maxByteValue
                          targetData[position + 1] = colorMap[mapIndex + colorMap.length / 3] / 65535 * maxByteValue
                          targetData[position + 2] = colorMap[mapIndex + colorMap.length / 3 * 2] / 65535 * maxByteValue
                          if (a) {
                            targetData[position + 3] = a(sample)
                          } else {
                            targetData[position + 3] = 255
                          }
                        }
                      }
                    }
                  }
                } else if (renderingMethod === 3) {
                  // YCbCr rendering
                  for (let xPos = xMin; xPos <= xMax; xPos++) {
                    const longitude = tileBbox.minLon + tx * xPos
                    for (let yPos = yMin; yPos <= yMax; yPos++) {
                      const latitude = tileBbox.minLat + ty * yPos
                      const coordinate = transform.inverse([longitude, latitude])
                      const px = Math.round((coordinate[0] - x0) / dx)
                      const py = Math.round((coordinate[1] - y0) / dy)
                      const position = 4 * (width * (height - yPos) + xPos)
                      const sourcePosition = imageWidth * py + px
                      const offset = bytesPerSample * sourcePosition
                      if (offset >= 0 && offset < size) {
                        const sample = GeoTiffUtilities.getSample(fd, offset, bytesPerSample, bitsPerSample, reader, littleEndian)
                        const y = sample[0]
                        const cb = sample[1]
                        const cr = sample[2]
                        targetData[position] = (y + (1.40200 * (cr - 0x80)))
                        targetData[position + 1] = (y - (0.34414 * (cb - 0x80)) - (0.71414 * (cr - 0x80)))
                        targetData[position + 2] = (y + (1.77200 * (cb - 0x80)))
                        targetData[position + 3] = 255
                      }
                    }
                  }
                } else if (renderingMethod === 4) {
                  // CMYK rendering
                  for (let xPos = xMin; xPos <= xMax; xPos++) {
                    const longitude = tileBbox.minLon + tx * xPos
                    for (let yPos = yMin; yPos <= yMax; yPos++) {
                      const latitude = tileBbox.minLat + ty * yPos
                      const coordinate = transform.inverse([longitude, latitude])
                      const px = Math.round((coordinate[0] - x0) / dx)
                      const py = Math.round((coordinate[1] - y0) / dy)
                      const position = 4 * (width * (height - yPos) + xPos)
                      const sourcePosition = imageWidth * py + px
                      const offset = bytesPerSample * sourcePosition
                      if (offset >= 0 && offset < size) {
                        const sample = GeoTiffUtilities.getSample(fd, offset, bytesPerSample, bitsPerSample, reader, littleEndian)
                        const c = sample[0]
                        const m = sample[1]
                        const y = sample[2]
                        const k = sample[3]
                        targetData[position] = 255 * ((255 - c) / 256) * ((255 - k) / 256)
                        targetData[position + 1] = 255 * ((255 - m) / 256) * ((255 - k) / 256)
                        targetData[position + 2] = 255 * ((255 - y) / 256) * ((255 - k) / 256)
                        targetData[position + 3] = 255
                      }
                    }
                  }
                } else if (renderingMethod === 5) {
                  // CIELab rendering
                  const Xn = 0.95047
                  const Yn = 1.00000
                  const Zn = 1.08883
                  for (let xPos = xMin; xPos <= xMax; xPos++) {
                    const longitude = tileBbox.minLon + tx * xPos
                    for (let yPos = yMin; yPos <= yMax; yPos++) {
                      const latitude = tileBbox.minLat + ty * yPos
                      const coordinate = transform.inverse([longitude, latitude])
                      const px = Math.round((coordinate[0] - x0) / dx)
                      const py = Math.round((coordinate[1] - y0) / dy)
                      const position = 4 * (width * (height - yPos) + xPos)
                      const sourcePosition = imageWidth * py + px
                      const offset = bytesPerSample * sourcePosition
                      if (offset >= 0 && offset < size) {
                        const sample = GeoTiffUtilities.getSample(fd, offset, bytesPerSample, bitsPerSample, reader, littleEndian)
                        const L = sample[0]
                        const a_ = sample[1] << 24 >> 24 // conversion from uint8 to int8
                        const b_ = sample[2] << 24 >> 24 // same
                        let y = (L + 16) / 116
                        let x = (a_ / 500) + y
                        let z = y - (b_ / 200)
                        let r
                        let g
                        let b
                        x = Xn * ((x * x * x > 0.008856) ? x * x * x : (x - (16 / 116)) / 7.787)
                        y = Yn * ((y * y * y > 0.008856) ? y * y * y : (y - (16 / 116)) / 7.787)
                        z = Zn * ((z * z * z > 0.008856) ? z * z * z : (z - (16 / 116)) / 7.787)
                        r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986)
                        g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415)
                        b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570)
                        r = (r > 0.0031308) ? ((1.055 * (r ** (1 / 2.4))) - 0.055) : 12.92 * r
                        g = (g > 0.0031308) ? ((1.055 * (g ** (1 / 2.4))) - 0.055) : 12.92 * g
                        b = (b > 0.0031308) ? ((1.055 * (b ** (1 / 2.4))) - 0.055) : 12.92 * b
                        targetData[position] = Math.max(0, Math.min(1, r)) * 255
                        targetData[position + 1] = Math.max(0, Math.min(1, g)) * 255
                        targetData[position + 2] = Math.max(0, Math.min(1, b)) * 255
                        targetData[position + 3] = 255
                      }
                    }
                  }
                }
              }
            }
            image.getBase64Async(jimp.MIME_PNG).then(base64Image => {
              resolve(base64Image)
            })
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error)
            reject(error)
          }
        })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e)
        reject(e)
      }
    })
  }
}
