import fs from 'fs'
import bbox from '@turf/bbox'
import bboxPolygon from '@turf/bbox-polygon'
import intersect from '@turf/intersect'
import { wgs84ToWebMercator, getConverter, defineProjection } from '../../projection/ProjectionUtilities'
import { getWebMercatorBoundingBoxFromXYZ, tileIntersects } from '../tile/TileBoundingBoxUtils'
import { trimExtentToWebMercatorMax } from '../xyz/XYZTileUtilities'
import { MAX_BYTE_VALUE, getSample, getReaderForSample, stretchValue, getMaxForDataType } from '../geotiff/GeoTiffUtilities'
import { disposeCanvas, createCanvas, makeImageData } from '../canvas/CanvasUtilities'
import keys from 'lodash/keys'
import { COLON_DELIMITER, EPSG, WEB_MERCATOR } from '../../projection/ProjectionConstants'
import { getWGS84BoundingBoxFromXYZ, trimExtentToWGS84Max } from '../xyz/WGS84XYZTileUtilities'


/**
 * Requests a tile from the decompressed binary data file representing a geotiff
 * @param tileRequest
 * @returns {Promise<any>}
 */
function requestTile (tileRequest) {
  return new Promise((resolve, reject) => {
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
      coords,
      crs,
      projection
    } = tileRequest

    const { x, y, z } = coords
    const fd = fs.openSync(rasterFile, 'r')
    const size = fs.statSync(rasterFile).size

    let epsgString = srs
    if (typeof epsgString !== 'string' || !epsgString.startsWith(EPSG)) {
      epsgString = EPSG + COLON_DELIMITER + srs
    }
    if (projection != null) {
      defineProjection(epsgString, projection)
    }

    let canvas
    // create an image to store
    try {
      canvas = createCanvas(width, height)
      const ctx = canvas.getContext('2d')
      const imageData = makeImageData(width, height)

      let targetData = imageData.data

      let tileBbox, tileUpperRightBuffered, tileLowerLeftBuffered, fullExtent, ll, ur
      if (crs === WEB_MERCATOR) {
        tileBbox = getWebMercatorBoundingBoxFromXYZ(x, y, z)
        tileUpperRightBuffered = wgs84ToWebMercator.inverse([tileBbox.maxLon + (tileBbox.maxLon - tileBbox.minLon), tileBbox.maxLat + (tileBbox.maxLat - tileBbox.minLat)])
        tileLowerLeftBuffered = wgs84ToWebMercator.inverse([tileBbox.minLon - (tileBbox.maxLon - tileBbox.minLon), tileBbox.minLat - (tileBbox.maxLat - tileBbox.minLat)])
        fullExtent = trimExtentToWebMercatorMax(extent)
        ur = wgs84ToWebMercator.forward([fullExtent[2], fullExtent[3]])
        ll = wgs84ToWebMercator.forward([fullExtent[0], fullExtent[1]])
      } else {
        tileBbox = getWGS84BoundingBoxFromXYZ(x, y, z)
        tileUpperRightBuffered = [tileBbox.maxLon + (tileBbox.maxLon - tileBbox.minLon), tileBbox.maxLat + (tileBbox.maxLat - tileBbox.minLat)]
        tileLowerLeftBuffered = [tileBbox.minLon - (tileBbox.maxLon - tileBbox.minLon), tileBbox.minLat - (tileBbox.maxLat - tileBbox.minLat)]
        fullExtent = trimExtentToWGS84Max(extent)
        ur = [fullExtent[2], fullExtent[3]]
        ll = [fullExtent[0], fullExtent[1]]
      }

      // if layer does not overlap with tile request, return an empty tile
      if (tileIntersects(tileUpperRightBuffered, tileLowerLeftBuffered, [fullExtent[2], fullExtent[3]], [fullExtent[0], fullExtent[1]])) {
        const transform = getConverter(epsgString, crs)

        // get intersection of request and source data, this is in 3857
        const intersection = intersect.default(bboxPolygon.default([ll[0], ll[1], ur[0], ur[1]]), bboxPolygon.default([tileBbox.minLon, tileBbox.minLat, tileBbox.maxLon, tileBbox.maxLat]))

        if (intersection != null) {
          const reader = getReaderForSample(0, sampleFormat, bitsPerSample[0])
          const intersectionBbox = bbox.default(intersection)

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

              let setG = grayScaleColorGradient === 0 ? (
                stretchToMinMax ? (position, sample) => {
                  const value = MAX_BYTE_VALUE - stretchValue(g(sample), grayBandMin, grayBandMax)
                  targetData[position] = value
                  targetData[position + 1] = value
                  targetData[position + 2] = value
                } : (position, sample) => {
                  const value = MAX_BYTE_VALUE - g(sample) / grayBandDataTypeMax * MAX_BYTE_VALUE
                  targetData[position] = value
                  targetData[position + 1] = value
                  targetData[position + 2] = value
                }
              ) : (
                stretchToMinMax ? (position, sample) => {
                  const value = stretchValue(g(sample), grayBandMin, grayBandMax)
                  targetData[position] = value
                  targetData[position + 1] = value
                  targetData[position + 2] = value
                } : (position, sample) => {
                  const value = g(sample) / grayBandDataTypeMax * MAX_BYTE_VALUE
                  targetData[position] = value
                  targetData[position + 1] = value
                  targetData[position + 2] = value
                }
              )
              let setA = (position) => targetData[position + 3] = MAX_BYTE_VALUE

              let a
              if (alphaBand > 0) {
                a = (sample) => sample[grayBand - 1]
                setA = (position, sample) => targetData[position + 3] = a(sample)
              }
              let grayBandDataTypeMax = getMaxForDataType(bitsPerSample[grayBand])
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
                    const sample = getSample(fd, offset, bytesPerSample, bitsPerSample, reader, littleEndian)
                    const position = 4 * (width * (height - yPos) + xPos)
                    setG(position, sample)
                    setA(position, sample)
                    if (targetData[position + 3] !== 0 && enableGlobalNoDataValue && targetData[position] === globalNoDataValue) {
                      targetData[position + 3] = 0
                    }
                  }
                }
              }
            }
          } else if (renderingMethod === 1) {
            // RGB rendering
            let r, g, b, a
            let redBandDataTypeMax = MAX_BYTE_VALUE
            let greenBandDataTypeMax = MAX_BYTE_VALUE
            let blueBandDataTypeMax = MAX_BYTE_VALUE

            let setR = () => {
            }
            let setG = () => {
            }
            let setB = () => {
            }
            let setA = (position) => targetData[position + 3] = MAX_BYTE_VALUE
            if (redBand > 0) {
              redBandDataTypeMax = getMaxForDataType(bitsPerSample[redBand - 1])
              r = (sample) => sample[redBand - 1]
              setR = stretchToMinMax ? (position, sample) => targetData[position] = stretchValue(r(sample), redBandMin, redBandMax) : (position, sample) => targetData[position] = r(sample) / redBandDataTypeMax * MAX_BYTE_VALUE
            }
            if (greenBand > 0) {
              greenBandDataTypeMax = getMaxForDataType(bitsPerSample[greenBand - 1])
              g = (sample) => sample[greenBand - 1]
              setG = stretchToMinMax ? (position, sample) => targetData[position + 1] = stretchValue(g(sample), greenBandMin, greenBandMax) : (position, sample) => targetData[position + 1] = g(sample) / greenBandDataTypeMax * MAX_BYTE_VALUE
            }
            if (blueBand > 0) {
              blueBandDataTypeMax = getMaxForDataType(bitsPerSample[blueBand - 1])
              b = (sample) => sample[blueBand - 1]
              setB = stretchToMinMax ? (position, sample) => targetData[position + 2] = stretchValue(b(sample), blueBandMin, blueBandMax) : (position, sample) => targetData[position + 2] = b(sample) / blueBandDataTypeMax * MAX_BYTE_VALUE
            }
            if (alphaBand > 0) {
              a = (sample) => sample[alphaBand - 1]
              setA = (position, sample) => targetData[position + 3] = a(sample)
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
                  const sample = getSample(fd, offset, bytesPerSample, bitsPerSample, reader, littleEndian)
                  // set value on target here
                  setR(position, sample)
                  setG(position, sample)
                  setB(position, sample)
                  setA(position, sample)
                  if (targetData[position + 3] !== 0 && enableGlobalNoDataValue && targetData[position] === globalNoDataValue && targetData[(position) + 1] === globalNoDataValue && targetData[(position) + 2] === globalNoDataValue) {
                    targetData[position + 3] = 0
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
                    const sample = getSample(fd, offset, bytesPerSample, bitsPerSample, reader, littleEndian)
                    const mapIndex = p(sample)
                    let colorMapLength = colorMap.length
                    if (colorMapLength == null || colorMapLength <= 0) {
                      colorMapLength = keys(colorMap).length
                    }
                    targetData[position] = colorMap[mapIndex] / 65535 * MAX_BYTE_VALUE
                    targetData[position + 1] = colorMap[mapIndex + colorMapLength / 3] / 65535 * MAX_BYTE_VALUE
                    targetData[position + 2] = colorMap[mapIndex + colorMapLength / 3 * 2] / 65535 * MAX_BYTE_VALUE
                    if (a) {
                      targetData[position + 3] = a(sample)
                    } else {
                      targetData[position + 3] = MAX_BYTE_VALUE
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
                  const sample = getSample(fd, offset, bytesPerSample, bitsPerSample, reader, littleEndian)
                  const y = sample[0]
                  const cb = sample[1]
                  const cr = sample[2]
                  targetData[position] = (y + (1.40200 * (cr - 0x80)))
                  targetData[position + 1] = (y - (0.34414 * (cb - 0x80)) - (0.71414 * (cr - 0x80)))
                  targetData[position + 2] = (y + (1.77200 * (cb - 0x80)))
                  targetData[position + 3] = MAX_BYTE_VALUE
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
                  const sample = getSample(fd, offset, bytesPerSample, bitsPerSample, reader, littleEndian)
                  const c = sample[0]
                  const m = sample[1]
                  const y = sample[2]
                  const k = sample[3]
                  targetData[position] = MAX_BYTE_VALUE * ((MAX_BYTE_VALUE - c) / (MAX_BYTE_VALUE + 1)) * ((MAX_BYTE_VALUE - k) / (MAX_BYTE_VALUE + 1))
                  targetData[position + 1] = MAX_BYTE_VALUE * ((MAX_BYTE_VALUE - m) / (MAX_BYTE_VALUE + 1)) * ((MAX_BYTE_VALUE - k) / (MAX_BYTE_VALUE + 1))
                  targetData[position + 2] = MAX_BYTE_VALUE * ((MAX_BYTE_VALUE - y) / (MAX_BYTE_VALUE + 1)) * ((MAX_BYTE_VALUE - k) / (MAX_BYTE_VALUE + 1))
                  targetData[position + 3] = MAX_BYTE_VALUE
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
                  const sample = getSample(fd, offset, bytesPerSample, bitsPerSample, reader, littleEndian)
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
                  targetData[position] = Math.max(0, Math.min(1, r)) * MAX_BYTE_VALUE
                  targetData[position + 1] = Math.max(0, Math.min(1, g)) * MAX_BYTE_VALUE
                  targetData[position + 2] = Math.max(0, Math.min(1, b)) * MAX_BYTE_VALUE
                  targetData[position + 3] = MAX_BYTE_VALUE
                }
              }
            }
          }
        }
      }
      ctx.putImageData(imageData, 0, 0)
      const result = canvas.toDataURL()
      resolve(result)
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to render tile.')
      reject(e)
    } finally {
      disposeCanvas(canvas)
      fs.closeSync(fd)
    }
  })
}

export {
  requestTile
}
