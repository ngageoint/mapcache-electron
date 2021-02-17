import TileBoundingBoxUtils from '../../../tile/tileBoundingBoxUtils'
import proj4 from 'proj4'
import GeoTiffLayer from '../tile/GeoTiffLayer'
import { bbox, bboxPolygon, intersect } from '@turf/turf'
import _ from 'lodash'
import defs from '../../../projection/proj4Defs'
import XYZTileUtilities from '../../../XYZTileUtilities'
for (const name in defs) {
  if (defs[name]) {
    proj4.defs(name, defs[name])
  }
}

const maxByteValue = 255

export default class GeoTiffRenderer {
  layer
  constructor (geoTiffLayer) {
    this.layer = geoTiffLayer
  }

  async renderTile (coords, tile, done) {
    let {x, y, z} = coords

    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
    let tileUpperRightBuffered = proj4('EPSG:3857').inverse([tileBbox.maxLon + (tileBbox.maxLon - tileBbox.minLon), tileBbox.maxLat + (tileBbox.maxLat - tileBbox.minLat)])
    let tileLowerLeftBuffered = proj4('EPSG:3857').inverse([tileBbox.minLon - (tileBbox.maxLon - tileBbox.minLon), tileBbox.minLat - (tileBbox.maxLat - tileBbox.minLat)])
    const fullExtent = XYZTileUtilities.trimExtentToWebMercatorMax(this.layer.extent)

    // create a 256x256 tile if not already provided
    if (!tile) {
      tile = document.createElement('canvas')
      tile.width = 256
      tile.height = 256
    }

    let ctx = tile.getContext('2d')
    ctx.clearRect(0, 0, tile.width, tile.height)
    let target = ctx.createImageData(tile.width, tile.height)
    let targetData = target.data
    // if layer does not overlap with tile request, return an empty tile
    if (TileBoundingBoxUtils.tileIntersects(tileUpperRightBuffered, tileLowerLeftBuffered, [fullExtent[2], fullExtent[3]], [fullExtent[0], fullExtent[1]])) {
      const transform4326To3857 = proj4('EPSG:4326', 'EPSG:3857')
      const transform = proj4('EPSG:' + this.layer.srs, 'EPSG:3857')
      const ur = transform4326To3857.forward([fullExtent[2], fullExtent[3]])
      const ll = transform4326To3857.forward([fullExtent[0], fullExtent[1]])

      // get intersection of request and source data, this is in 3857
      const intersection = intersect(bboxPolygon([ll[0], ll[1], ur[0], ur[1]]), bboxPolygon([tileBbox.minLon, tileBbox.minLat, tileBbox.maxLon, tileBbox.maxLat]))

      if (!_.isNil(intersection)) {
        const intersectionBbox = bbox(intersection)

        // determine tx, ty
        const tx = (tileBbox.maxLon - tileBbox.minLon) / tile.width
        const ty = (tileBbox.maxLat - tileBbox.minLat) / tile.height

        // determine pixel range
        const xMin = Math.max(Math.round((intersectionBbox[0] - tileBbox.minLon) / tx))
        const xMax = Math.min(tile.width - 1, Math.round((intersectionBbox[2] - tileBbox.minLon) / tx))
        const yMin = Math.max(0, Math.round((intersectionBbox[1] - tileBbox.minLat) / ty))
        const yMax = Math.min(tile.height, Math.round((intersectionBbox[3] - tileBbox.minLat) / ty))

        const x0 = this.layer.image.getOrigin()[0]
        const y0 = this.layer.image.getOrigin()[1]
        const dx = this.layer.image.getResolution()[0]
        const dy = this.layer.image.getResolution()[1]


        let redBand = this.layer.redBand
        let greenBand = this.layer.greenBand
        let blueBand = this.layer.blueBand
        let renderingMethod = this.layer.renderingMethod

        if (renderingMethod === 0) {
          // gray rendering (either whiteIsZero or blackIsZero
          if (this.layer.grayBand > 0) {
            let grayBand = this.layer.rasters[this.layer.grayBand - 1]
            let alphaBand = this.layer.alphaBand > 0 ? this.layer.rasters[this.layer.alphaBand - 1] : []
            let noDataValue = this.layer.globalNoDataValue
            let grayBandDataTypeMax = GeoTiffLayer.getMaxForDataType(this.layer.bitsPerSample[this.layer.grayBand])

            // iterate over each pixel, and based on method, utilize rendering
            for (let xPos = xMin; xPos <= xMax; xPos++) {
              const longitude = tileBbox.minLon + tx * xPos
              for (let yPos = yMin; yPos <= yMax; yPos++) {
                const latitude = tileBbox.minLat + ty * yPos
                const coordinate = transform.inverse([longitude, latitude])
                const px = Math.round((coordinate[0] - x0) / dx)
                const py = Math.round((coordinate[1] - y0) / dy)
                const sourcePosition = this.layer.image.getWidth() * py + px

                let value = grayBand[sourcePosition]
                if (this.layer.stretchToMinMax) {
                  value = GeoTiffRenderer.stretchValue(value, this.layer.grayBandMin, this.layer.grayBandMax)
                } else {
                  value = value / grayBandDataTypeMax * maxByteValue
                }
                if (this.layer.grayScaleColorGradient === 0) {
                  value = maxByteValue - value
                }

                const position = 4 * (tile.width * (tile.height - yPos) + xPos)
                targetData[position] = value
                targetData[position + 1] = value
                targetData[position + 2] = value
                if (this.layer.alphaBand > 0) {
                  targetData[position + 3] = alphaBand[sourcePosition]
                } else {
                  targetData[position + 3] = 255
                }

                if (targetData[position + 3] !== 0) {
                  // alpha was good, check if it is a no data though...
                  if (this.layer.enableGlobalNoDataValue && targetData[position] === noDataValue) {
                    targetData[position + 3] = 0
                  }
                }
              }
            }
          }
        } else if (renderingMethod === 1) {
          // RGB rendering
          let r, g, b, a;
          let redBandDataTypeMax = maxByteValue
          let greenBandDataTypeMax = maxByteValue
          let blueBandDataTypeMax = maxByteValue

          if (redBand > 0) {
            redBandDataTypeMax = GeoTiffLayer.getMaxForDataType(this.layer.bitsPerSample[redBand - 1])
            r = this.layer.rasters[redBand - 1]
          }
          if (greenBand > 0) {
            greenBandDataTypeMax = GeoTiffLayer.getMaxForDataType(this.layer.bitsPerSample[greenBand - 1])
            g = this.layer.rasters[greenBand - 1]
          }
          if (blueBand > 0) {
            blueBandDataTypeMax = GeoTiffLayer.getMaxForDataType(this.layer.bitsPerSample[blueBand - 1])
            b = this.layer.rasters[blueBand - 1]
          }
          if (this.layer.alphaBand > 0) {
            a = this.layer.rasters[this.layer.alphaBand - 1]
          }

          for (let xPos = xMin; xPos <= xMax; xPos++) {
            const longitude = tileBbox.minLon + tx * xPos
            for (let yPos = yMin; yPos <= yMax; yPos++) {
              const latitude = tileBbox.minLat + ty * yPos
              const coordinate = transform.inverse([longitude, latitude])
              const px = Math.round((coordinate[0] - x0) / dx)
              const py = Math.round((coordinate[1] - y0) / dy)
              const position = 4 * (tile.width * (tile.height - yPos) + xPos)
              const sourcePosition = this.layer.image.getWidth() * py + px
              // set value on target here
              if (!_.isNil(r)) {
                targetData[position] = this.layer.stretchToMinMax ? GeoTiffRenderer.stretchValue(r[sourcePosition], this.layer.redBandMin, this.layer.redBandMax) : r[sourcePosition] / redBandDataTypeMax * maxByteValue
              } else {
                targetData[position] = 0
              }
              if (!_.isNil(g)) {
                targetData[position + 1] = this.layer.stretchToMinMax ? GeoTiffRenderer.stretchValue(g[sourcePosition], this.layer.greenBandMin, this.layer.greenBandMax) : g[sourcePosition] / greenBandDataTypeMax * maxByteValue
              } else {
                targetData[position + 1] = 0
              }
              if (!_.isNil(b)) {
                targetData[position + 2] = this.layer.stretchToMinMax ? GeoTiffRenderer.stretchValue(b[sourcePosition], this.layer.blueBandMin, this.layer.blueBandMax) : b[sourcePosition] / blueBandDataTypeMax * maxByteValue
              } else {
                targetData[position + 2] = 0
              }
              if (!_.isNil(a)) {
                targetData[position + 3] = a[sourcePosition]
              } else {
                targetData[position + 3] = 255
              }
              if (targetData[position + 3] !== 0) {
                if (this.layer.enableGlobalNoDataValue && targetData[position] === this.layer.globalNoDataValue && targetData[(position) + 1] === this.layer.globalNoDataValue && targetData[(position) + 2] === this.layer.globalNoDataValue) {
                  targetData[position + 3] = 0
                }
              }
            }
          }
        } else if (renderingMethod === 2) {
          // Palette rendering
          let colorMap = new Uint16Array(this.layer.colorMap.buffer)
          if (this.layer.paletteBand > 0) {
            let paletteBand = this.layer.rasters[this.layer.paletteBand - 1]
            let alphaBand = this.layer.alphaBand > 0 ? this.layer.rasters[this.layer.alphaBand - 1] : []
            for (let x = xMin; x <= xMax; x++) {
              const longitude = tileBbox.minLon + tx * x
              for (let y = yMin; y <= yMax; y++) {
                const latitude = tileBbox.minLat + ty * y
                const coordinate = transform.inverse([longitude, latitude])
                const px = Math.round((coordinate[0] - x0) / dx)
                const py = Math.round((coordinate[1] - y0) / dy)
                const position = 4 * (tile.width * (tile.height - y) + x)
                const sourcePosition = this.layer.image.getWidth() * py + px
                const mapIndex = paletteBand[sourcePosition]
                targetData[position] = colorMap[mapIndex] / 65535 * maxByteValue
                targetData[position + 1] = colorMap[mapIndex + colorMap.length / 3] / 65535 * maxByteValue
                targetData[position + 2] = colorMap[mapIndex + colorMap.length / 3 * 2] / 65535 * maxByteValue
                if (this.layer.alphaBand > 0) {
                  targetData[position + 3] = alphaBand[sourcePosition]
                } else {
                  targetData[position + 3] = 255
                }
              }
            }
          }
        } else if (this.layer.renderingMethod === 3) {
          // YCbCr rendering
          for (let xPos = xMin; xPos <= xMax; xPos++) {
            const longitude = tileBbox.minLon + tx * xPos
            for (let yPos = yMin; yPos <= yMax; yPos++) {
              const latitude = tileBbox.minLat + ty * yPos
              const coordinate = transform.inverse([longitude, latitude])
              const px = Math.round((coordinate[0] - x0) / dx)
              const py = Math.round((coordinate[1] - y0) / dy)
              const position = 4 * (tile.width * (tile.height - yPos) + xPos)
              const sourcePosition = this.layer.image.getWidth() * py + px
              const y = this.layer.rasters[0][sourcePosition]
              const cb = this.layer.rasters[1][sourcePosition]
              const cr = this.layer.rasters[2][sourcePosition]
              targetData[position] = (y + (1.40200 * (cr - 0x80)))
              targetData[position + 1] = (y - (0.34414 * (cb - 0x80)) - (0.71414 * (cr - 0x80)))
              targetData[position + 2] = (y + (1.77200 * (cb - 0x80)))
              targetData[position + 3] = 255
            }
          }
        } else if (this.layer.renderingMethod === 4) {
          // CMYK rendering
          for (let xPos = xMin; xPos <= xMax; xPos++) {
            const longitude = tileBbox.minLon + tx * xPos
            for (let yPos = yMin; yPos <= yMax; yPos++) {
              const latitude = tileBbox.minLat + ty * yPos
              const coordinate = transform.inverse([longitude, latitude])
              const px = Math.round((coordinate[0] - x0) / dx)
              const py = Math.round((coordinate[1] - y0) / dy)
              const position = 4 * (tile.width * (tile.height - yPos) + xPos)
              const sourcePosition = this.layer.image.getWidth() * py + px
              const c = this.layer.rasters[0][sourcePosition]
              const m = this.layer.rasters[1][sourcePosition]
              const y = this.layer.rasters[2][sourcePosition]
              const k = this.layer.rasters[3][sourcePosition]
              targetData[position] = 255 * ((255 - c) / 256) * ((255 - k) / 256)
              targetData[position + 1] = 255 * ((255 - m) / 256) * ((255 - k) / 256)
              targetData[position + 2] = 255 * ((255 - y) / 256) * ((255 - k) / 256)
              targetData[position + 3] = 255
            }
          }
        } else if (this.layer.renderingMethod === 5) {
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
              const position = 4 * (tile.width * (tile.height - yPos) + xPos)
              const sourcePosition = this.layer.image.getWidth() * py + px
              const L = this.layer.rasters[0][sourcePosition]
              const a_ = this.layer.rasters[1][sourcePosition] << 24 >> 24 // conversion from uint8 to int8
              const b_ = this.layer.rasters[2][sourcePosition] << 24 >> 24 // same

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
    ctx.putImageData(target, 0, 0)

    setTimeout(() => {
      if (done) {
        done(null, tile)
      }
    }, 0)
    return {
      canvas: tile
    }
  }

  createRGBArrays (width, height) {
    let ArrayType = Uint8Array
    let dt = this.layer.bitsPerSample[0]
    if (dt === 16) {
      ArrayType = Uint16Array
    }
    let r = new ArrayType(new ArrayBuffer((this.layer.bitsPerSample[0] / 8) * width * height))
    let g = new ArrayType(new ArrayBuffer((this.layer.bitsPerSample[1] / 8) * width * height))
    let b = new ArrayType(new ArrayBuffer((this.layer.bitsPerSample[2] / 8) * width * height))
    let a = new ArrayType(new ArrayBuffer((this.layer.bitsPerSample.length > 3 ? (this.layer.bitsPerSample[3] / 8) : (this.layer.bitsPerSample[2] / 8)) * width * height))
    return {
      r, g, b, a
    }
  }

  static stretchValue (value, min, max) {
    let stretchedValue = (value - min) / (max - min) * maxByteValue
    if (stretchedValue < 0) {
      stretchedValue = 0
    } else if (stretchedValue > maxByteValue) {
      stretchedValue = maxByteValue
    }
    return stretchedValue
  }
}
