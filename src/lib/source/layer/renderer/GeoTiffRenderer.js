import TileBoundingBoxUtils from '../../../tile/tileBoundingBoxUtils'
import proj4 from 'proj4'
import GeoTiffLayer from '../tile/GeoTiffLayer'
import { bbox, bboxPolygon, intersect } from '@turf/turf'
import _ from 'lodash'
import defs from '../../../projection/proj4Defs'
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

    let hasAlpha = false
    let blank = true

    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
    let tileUpperRightBuffered = proj4('EPSG:3857').inverse([tileBbox.maxLon + (tileBbox.maxLon - tileBbox.minLon), tileBbox.maxLat + (tileBbox.maxLat - tileBbox.minLat)])
    let tileLowerLeftBuffered = proj4('EPSG:3857').inverse([tileBbox.minLon - (tileBbox.maxLon - tileBbox.minLon), tileBbox.minLat - (tileBbox.maxLat - tileBbox.minLat)])
    const fullExtent = this.layer.extent

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

        if (this.layer.renderingMethod === 0) {
          if (this.layer.grayBand > 0) {
            let grayBand = this.layer.rasters[this.layer.grayBand - 1]
            let alphaBand = this.layer.alphaBand > 0 ? this.layer.rasters[this.layer.alphaBand - 1] : []
            let noDataValue = this.layer.globalNoDataValue
            let grayBandDataTypeMax = GeoTiffLayer.getMaxForDataType(this.layer.bitsPerSample[this.layer.grayBand])

            // iterate over each pixel, and based on method, utilize rendering
            for (let x = xMin; x <= xMax; x++) {
              const longitude = tileBbox.minLon + tx * x
              for (let y = yMin; y <= yMax; y++) {
                const latitude = tileBbox.minLat + ty * y
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

                const position = 4 * (tile.width * (tile.height - y) + x)
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
                    hasAlpha = true
                  } else if (targetData[position + 3] === 0) {
                    hasAlpha = true
                  }
                }
                if (this.layer.enableGlobalOpacity) {
                  targetData[position + 3] = targetData[position + 3] * this.layer.globalOpacity / 100.0
                  hasAlpha = true
                }
                if (targetData[position + 3] !== 0) {
                  blank = false
                }
              }
            }
          }
        } else if (this.layer.renderingMethod === 1) {
          let { r, g, b, a } = this.createRGBArrays(tile.width, tile.height)
          let redBandDataTypeMax = maxByteValue
          let greenBandDataTypeMax = maxByteValue
          let blueBandDataTypeMax = maxByteValue

          if (this.layer.redBand > 0) {
            redBandDataTypeMax = GeoTiffLayer.getMaxForDataType(this.layer.bitsPerSample[this.layer.redBand - 1])
            r = this.layer.rasters[this.layer.redBand - 1]
          }
          if (this.layer.greenBand > 0) {
            greenBandDataTypeMax = GeoTiffLayer.getMaxForDataType(this.layer.bitsPerSample[this.layer.greenBand - 1])
            g = this.layer.rasters[this.layer.greenBand - 1]
          }
          if (this.layer.blueBand > 0) {
            blueBandDataTypeMax = GeoTiffLayer.getMaxForDataType(this.layer.bitsPerSample[this.layer.blueBand - 1])
            b = this.layer.rasters[this.layer.blueBand - 1]
          }
          if (this.layer.alphaBand > 0) {
            a = this.layer.rasters[this.layer.alphaBand - 1]
          }

          for (let x = xMin; x <= xMax; x++) {
            const longitude = tileBbox.minLon + tx * x
            for (let y = yMin; y <= yMax; y++) {
              const latitude = tileBbox.minLat + ty * y
              const coordinate = transform.inverse([longitude, latitude])
              const px = Math.round((coordinate[0] - x0) / dx)
              const py = Math.round((coordinate[1] - y0) / dy)
              const position = 4 * (tile.width * (tile.height - y) + x)
              const sourcePosition = this.layer.image.getWidth() * py + px
              // set value on target here
              if (this.layer.redBand > 0) {
                targetData[position] = this.layer.stretchToMinMax ? GeoTiffRenderer.stretchValue(r[sourcePosition], this.layer.redBandMin, this.layer.redBandMax) : r[sourcePosition] / redBandDataTypeMax * maxByteValue
              } else {
                targetData[position] = 0
              }
              if (this.layer.greenBand > 0) {
                targetData[position + 1] = this.layer.stretchToMinMax ? GeoTiffRenderer.stretchValue(g[sourcePosition], this.layer.greenBandMin, this.layer.greenBandMax) : g[sourcePosition] / greenBandDataTypeMax * maxByteValue
              } else {
                targetData[position + 1] = 0
              }
              if (this.layer.blueBand > 0) {
                targetData[position + 2] = this.layer.stretchToMinMax ? GeoTiffRenderer.stretchValue(b[sourcePosition], this.layer.blueBandMin, this.layer.blueBandMax) : b[sourcePosition] / blueBandDataTypeMax * maxByteValue
              } else {
                targetData[position + 2] = 0
              }
              if (this.layer.alphaBand > 0) {
                targetData[position + 3] = a[sourcePosition]
              } else {
                targetData[position + 3] = 255
              }
              if (targetData[position + 3] !== 0) {
                if (this.layer.enableGlobalNoDataValue && targetData[position] === this.layer.globalNoDataValue && targetData[(position) + 1] === this.layer.globalNoDataValue && targetData[(position) + 2] === this.layer.globalNoDataValue) {
                  targetData[position + 3] = 0
                  hasAlpha = true
                }
              }
              if (targetData[position + 3] === 0) {
                hasAlpha = true
              }
              if (this.layer.enableGlobalOpacity) {
                targetData[position + 3] = targetData[position + 3] * this.layer.globalOpacity / 100.0
                hasAlpha = true
              }
              if (targetData[position + 3] !== 0) {
                blank = false
              }
            }
          }
        } else if (this.layer.renderingMethod === 2) {
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

                if (alphaBand[sourcePosition] === 0) {
                  hasAlpha = true
                }
                if (this.layer.enableGlobalOpacity) {
                  targetData[position + 3] = targetData[position + 3] * this.layer.globalOpacity / 100.0
                  hasAlpha = true
                }
                if (targetData[position + 3] !== 0) {
                  blank = false
                }
              }
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
      canvas: tile,
      hasAlpha: hasAlpha,
      blank: blank
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
