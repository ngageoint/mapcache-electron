import TileBoundingBoxUtils from '../../../tile/tileBoundingBoxUtils'
import proj4 from 'proj4'
import gdal from 'gdal'
import GeoTiffLayer from '../GeoTiffLayer'

var defs = require('../../../projection/proj4Defs')
for (var name in defs) {
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

    var gt = this.layer.ds.geoTransform
    if (gt[2] !== 0 || gt[4] !== 0) {
      return done()
    }

    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
    let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
    let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])
    let tileUpperRightBuffered = proj4('EPSG:3857').inverse([tileBbox.maxLon + (tileBbox.maxLon - tileBbox.minLon), tileBbox.maxLat + (tileBbox.maxLat - tileBbox.minLat)])
    let tileLowerLeftBuffered = proj4('EPSG:3857').inverse([tileBbox.minLon - (tileBbox.maxLon - tileBbox.minLon), tileBbox.minLat - (tileBbox.maxLat - tileBbox.minLat)])
    var fullExtent = this.layer.extent
    if (!TileBoundingBoxUtils.tileIntersects(tileUpperRightBuffered, tileLowerLeftBuffered, [fullExtent[2], fullExtent[3]], [fullExtent[0], fullExtent[1]])) {
      if (done) {
        return done(null, tile)
      }
      return
    }

    if (!tile) {
      tile = document.createElement('canvas')
      tile.width = 256
      tile.height = 256
    }

    let ctx = tile.getContext('2d')

    let target = ctx.createImageData(tile.width, tile.height)
    let targetData = target.data

    var tileCutline = this.createCutlineInProjection({west: tileLowerLeft[0], south: tileLowerLeft[1], east: tileUpperRight[0], north: tileUpperRight[1]}, gdal.SpatialReference.fromEPSG(3857))
    var srcCutline = this.createPixelCoordinateCutline({west: fullExtent[0], south: fullExtent[1], east: fullExtent[2], north: fullExtent[3]}, this.layer.ds)

    let srcBands = []
    let dstBands = []
    for (let i = 1; i <= this.layer.ds.bands.count(); i++) {
      srcBands.push(i)
      dstBands.push(i)
    }

    let reprojectedFile = this.reproject(this.layer.ds, 3857, tileCutline, srcCutline, srcBands, dstBands, this.layer.alphaBand, tile.width, tile.height)

    this.populateTargetData(targetData, reprojectedFile, tile.width, tile.height)

    reprojectedFile.close()

    ctx.clearRect(0, 0, tile.width, tile.height)
    ctx.putImageData(target, 0, 0)
    setTimeout(() => {
      if (done) {
        done(null, tile)
      }
    }, 0)
    return tile.toDataURL()
  }

  createRGBArrays (width, height) {
    let ArrayType = Uint8Array
    let dt = this.layer.ds.bands.get(1).dataType
    if (dt === gdal.GDT_UInt16) {
      ArrayType = Uint16Array
    }
    let r = new ArrayType(new ArrayBuffer((this.layer.bitsPerSample[0] / 8) * width * height))
    let g = new ArrayType(new ArrayBuffer((this.layer.bitsPerSample[1] / 8) * width * height))
    let b = new ArrayType(new ArrayBuffer((this.layer.bitsPerSample[2] / 8) * width * height))
    let a = new ArrayType(new ArrayBuffer((this.layer.bitsPerSample.length === 4 ? (this.layer.bitsPerSample[3] / 8) : (this.layer.bitsPerSample[2] / 8)) * width * height))
    return {
      r, g, b, a
    }
  }

  stretchValue (value, min, max) {
    let stretchedValue = (value - min) / (max - min) * maxByteValue
    if (stretchedValue < 0) {
      stretchedValue = 0
    } else if (stretchedValue > maxByteValue) {
      stretchedValue = maxByteValue
    }
    return stretchedValue
  }

  populateTargetData (targetData, ds, width, height) {
    const alphaBandVal = this.layer.alphaBand || ds.bands.count()
    if (this.layer.renderingMethod === 0) {
      if (this.layer.grayBand > 0) {
        let grayBand = ds.bands.get(this.layer.grayBand).pixels.read(0, 0, width, height, null, {})
        let alphaBand = ds.bands.get(alphaBandVal).pixels.read(0, 0, width, height, null, {})
        let noDataValue = ds.bands.get(this.layer.grayBand).noDataValue
        let grayBandDataTypeMax = GeoTiffLayer.getMaxForDataType(ds.bands.get(this.layer.grayBand).dataType)
        for (let pos = 0, i = 0; pos < grayBand.length * 4; pos += 4, i++) {
          let value = grayBand[i]
          if (this.layer.stretchToMinMax) {
            value = this.stretchValue(value, this.layer.grayBandMin, this.layer.grayBandMax)
          } else {
            value = value / grayBandDataTypeMax * maxByteValue
          }
          if (this.layer.grayScaleColorGradient === 0) {
            value = maxByteValue - value
          }
          targetData[pos] = value
          targetData[pos + 1] = value
          targetData[pos + 2] = value
          targetData[pos + 3] = alphaBand[i]
          if (targetData[pos + 3] !== 0) {
            // alpha was good, check if it is a no data though...
            if (targetData[pos] === noDataValue) {
              targetData[pos + 3] = 0
            }
          }
        }
      }
    } else if (this.layer.renderingMethod === 1) {
      let { r, g, b, a } = this.createRGBArrays(width, height)
      let redNoDataValue = null
      let greenNoDataValue = null
      let blueNoDataValue = null
      let redBandDataTypeMax = maxByteValue
      let greenBandDataTypeMax = maxByteValue
      let blueBandDataTypeMax = maxByteValue
      if (this.layer.redBand > 0) {
        redNoDataValue = ds.bands.get(this.layer.redBand).noDataValue
        redBandDataTypeMax = GeoTiffLayer.getMaxForDataType(ds.bands.get(this.layer.redBand).dataType)
        ds.bands.get(this.layer.redBand).pixels.read(0, 0, width, height, r, {})
      }
      if (this.layer.greenBand > 0) {
        greenNoDataValue = ds.bands.get(this.layer.greenBand).noDataValue
        greenBandDataTypeMax = GeoTiffLayer.getMaxForDataType(ds.bands.get(this.layer.greenBand).dataType)
        ds.bands.get(this.layer.greenBand).pixels.read(0, 0, width, height, g, {})
      }
      if (this.layer.blueBand > 0) {
        blueNoDataValue = ds.bands.get(this.layer.blueBand).noDataValue
        blueBandDataTypeMax = GeoTiffLayer.getMaxForDataType(ds.bands.get(this.layer.blueBand).dataType)
        ds.bands.get(this.layer.blueBand).pixels.read(0, 0, width, height, b, {})
      }
      if (alphaBandVal) {
        ds.bands.get(alphaBandVal).pixels.read(0, 0, width, height, a, {})
      }
      for (let i = 0; i < r.length; i++) {
        if (this.layer.redBand > 0) {
          targetData[i * 4] = this.layer.stretchToMinMax ? this.stretchValue(r[i], this.layer.redBandMin, this.layer.redBandMax) : r[i] / redBandDataTypeMax * maxByteValue
        } else {
          targetData[i * 4] = 0
        }
        if (this.layer.greenBand > 0) {
          targetData[(i * 4) + 1] = this.layer.stretchToMinMax ? this.stretchValue(g[i], this.layer.greenBandMin, this.layer.greenBandMax) : g[i] / greenBandDataTypeMax * maxByteValue
        } else {
          targetData[(i * 4) + 1] = 0
        }
        if (this.layer.blueBand > 0) {
          targetData[(i * 4) + 2] = this.layer.stretchToMinMax ? this.stretchValue(b[i], this.layer.blueBandMin, this.layer.blueBandMax) : b[i] / blueBandDataTypeMax * maxByteValue
        } else {
          targetData[(i * 4) + 2] = 0
        }
        targetData[(i * 4) + 3] = a[i]
        if (targetData[(i * 4) + 3] !== 0) {
          if (targetData[i * 4] === redNoDataValue && targetData[(i * 4) + 1] === greenNoDataValue && targetData[(i * 4) + 2] === blueNoDataValue) {
            targetData[(i * 4) + 3] = 0
          }
        }
      }
    } else if (this.layer.renderingMethod === 2) {
      let colorMap = new Uint16Array(this.layer.colorMap.buffer)
      let readOptions = {}
      if (this.layer.paletteBand > 0) {
        let paletteBand = ds.bands.get(this.layer.paletteBand).pixels.read(0, 0, width, height, null, readOptions)
        let alphaBand = ds.bands.get(alphaBandVal).pixels.read(0, 0, width, height, null, readOptions)
        for (let i = 0, j = 0; i < paletteBand.length; ++i, j += 3) {
          const mapIndex = paletteBand[i]
          targetData[i * 4] = colorMap[mapIndex] / 65535 * maxByteValue
          targetData[(i * 4) + 1] = colorMap[mapIndex + colorMap.length / 3] / 65535 * maxByteValue
          targetData[(i * 4) + 2] = colorMap[mapIndex + colorMap.length / 3 * 2] / 65535 * maxByteValue
          targetData[(i * 4) + 2] = colorMap[mapIndex + colorMap.length / 3 * 2] / 65535 * maxByteValue
          targetData[(i * 4) + 3] = alphaBand[i]
        }
      }
    }
  }

  reproject (ds, epsgCode, tileCutline, srcCutline, srcBands, dstBands, alphaBand, width, height) {
    let tileExtent = tileCutline.getEnvelope()
    let targetSrs = gdal.SpatialReference.fromEPSG(epsgCode)

    let gt = ds.geoTransform

    let tr = {
      x: Math.max(tileExtent.maxX - tileExtent.minX) / width,
      y: Math.max(tileExtent.maxY - tileExtent.minY) / height
    }

    let numBands = ds.bands.count()
    if (!alphaBand > 0) {
      // no destination alpha band is set, we will add one for unset pixels
      numBands += 1
    }

    // extract no data values for each band
    const noDataArray = []
    for (let i = 1; i <= ds.bands.count(); i++) {
      noDataArray.push(this.layer.enableGlobalNoDataValue ? this.layer.globalNoDataValue : ds.bands.get(i).noDataValue)
    }

    let destination = gdal.open('memory', 'w', 'MEM', width, height, numBands, ds.bands.get(1).dataType)
    destination.srs = targetSrs
    destination.geoTransform = [
      tileExtent.minX, tr.x, gt[2],
      tileExtent.maxY, gt[4], -tr.y
    ]
    let sourceBands = srcBands
    let destinationBands = dstBands

    let options = {
      src: ds,
      dst: destination,
      s_srs: ds.srs, // jshint ignore:line
      t_srs: targetSrs, // jshint ignore:line
      cutline: srcCutline.getEnvelope().toPolygon(),
      sourceBands,
      destinationBands
    }
    if (alphaBand > 0) {
      options.srcAlphaBand = alphaBand
      options.dstAlphaBand = alphaBand
    } else {
      // again no dstAlphaBand was set, so specify band added
      options.dstAlphaBand = numBands
    }

    gdal.reprojectImage(options)

    // after reprojection, update no data values for reprojected bands for in-mem geotiff
    for (let i = 0; i < noDataArray.length; i++) {
      destination.bands.get(i + 1).noDataValue = noDataArray[i]
    }

    return destination
  }

  createPixelCoordinateCutline (envelope, ds) {
    var sourcePixels = new gdal.CoordinateTransformation(ds.srs, ds)
    var sourceCoords = new gdal.CoordinateTransformation(gdal.SpatialReference.fromEPSG(4326), ds.srs)

    var ul = sourceCoords.transformPoint(envelope.west, envelope.north)
    var ur = sourceCoords.transformPoint(envelope.east, envelope.north)
    var lr = sourceCoords.transformPoint(envelope.east, envelope.south)
    var ll = sourceCoords.transformPoint(envelope.west, envelope.south)

    ul = sourcePixels.transformPoint(ul.x, ul.y)
    ur = sourcePixels.transformPoint(ur.x, ur.y)
    lr = sourcePixels.transformPoint(lr.x, lr.y)
    ll = sourcePixels.transformPoint(ll.x, ll.y)

    var cutline = new gdal.Polygon()
    var ring = new gdal.LinearRing()
    ring.points.add([ul, ur, lr, ll, ul])
    cutline.rings.add(ring)
    return cutline
  }

  createCutlineInProjection (envelope, srs) {
    var tx = new gdal.CoordinateTransformation(gdal.SpatialReference.fromEPSG(4326), srs)

    var ul = tx.transformPoint(envelope.west, envelope.north)
    var ur = tx.transformPoint(envelope.east, envelope.north)
    var lr = tx.transformPoint(envelope.east, envelope.south)
    var ll = tx.transformPoint(envelope.west, envelope.south)

    var cutline = new gdal.Polygon()
    var ring = new gdal.LinearRing()
    ring.points.add([ul, ur, lr, ll, ul])
    cutline.rings.add(ring)
    return cutline
  }

  gdalInfo (ds, image) {
    let info = ''
    let size = ds.rasterSize
    if (ds.rasterSize) {
      info += 'width: ' + ds.rasterSize.x + '\n'
      info += 'height: ' + ds.rasterSize.y + '\n'
    }
    let geotransform = ds.geoTransform
    if (geotransform) {
      info += 'Origin = (' + geotransform[0] + ', ' + geotransform[3] + ')\n'
      info += 'Pixel Size = (' + geotransform[1] + ', ' + geotransform[5] + ')\n'
      info += 'GeoTransform =\n'
      info += geotransform + '\n'
    }

    let layer = ds.layers
    info += 'DataSource Layer Count ' + layer.count() + '\n'
    for (var i = 0; i < layer.count(); i++) {
      info += 'Layer ' + i + ': ' + layer.get(i) + '\n'
    }

    // if (image) {
    //   info += 'FileDirectory\n'
    //   for (let key in image.fileDirectory) {
    //     let varName = key.charAt(0).toLowerCase() + key.slice(1) + 's'
    //     console.log('varName', varName)
    //     let globals = GeoTIFFGlobals[varName]
    //     if (globals) {
    //       for (const globalKey in globals) {
    //         let globalValue = globals[globalKey]
    //         console.log('\tGlobal Key: ' + globalKey + ': Global Value: ' + globalValue)
    //         if (globalValue === image.fileDirectory[key]) {
    //           info += '\t' + key + ': ' + globalKey + ' (' + image.fileDirectory[key] + ')\n'
    //         }
    //       }
    //     } else {
    //       info += '\t' + key + ': ' + image.fileDirectory[key] + '\n'
    //     }
    //     // JSON.stringify(image.fileDirectory, null, 2)
    //   }
    // }

    info += 'srs: ' + (ds.srs ? ds.srs.toPrettyWKT() : 'null') + '\n'
    if (!ds.srs) return info
    // corners
    let corners = {
      'Upper Left  ': {x: 0, y: 0},
      'Upper Right ': {x: size.x, y: 0},
      'Bottom Right': {x: size.x, y: size.y},
      'Bottom Left ': {x: 0, y: size.y}
    }

    let wgs84 = gdal.SpatialReference.fromEPSG(4326)
    let coordTransform = new gdal.CoordinateTransformation(ds.srs, wgs84)

    info += 'Corner Coordinates:'
    let cornerNames = Object.keys(corners)

    let coordinateCorners = []

    cornerNames.forEach(function (cornerName) {
      // convert pixel x,y to the coordinate system of the raster
      // then transform it to WGS84
      let corner = corners[cornerName]
      let ptOrig = {
        x: geotransform[0] + corner.x * geotransform[1] + corner.y * geotransform[2],
        y: geotransform[3] + corner.x * geotransform[4] + corner.y * geotransform[5]
      }
      let ptWgs84 = coordTransform.transformPoint(ptOrig)
      info += `${cornerName} (${Math.floor(ptOrig.x * 100) / 100}, ${Math.floor(ptOrig.y * 100) / 100}) (${gdal.decToDMS(ptWgs84.x, 'Long')}, ${gdal.decToDMS(ptWgs84.y, 'Lat')})\n`
      coordinateCorners.push([ptWgs84.x, ptWgs84.y])
    })

    ds.bands.forEach(function (band) {
      info += `Band ${band.id} Block=${band.blocksize ? band.blocksize.x : 0}${band.blocksize ? band.blocksize.y : 0} Type=${band.dataType}, ColorInterp=${band.colorInterpretation}\n`

      if (band.description) {
        info += '  Description = ' + band.description + '\n'
      }
      info += '  Min=' + Math.floor(band.minimum * 1000) / 1000 + '\n'
      info += '  Max=' + Math.floor(band.maximum * 1000) / 1000 + '\n'
      if (band.noDataValue !== null) {
        info += '  NoData Value=' + band.noDataValue + '\n'
      }

      // band overviews
      let overviewInfo = []
      band.overviews.forEach(function (overview) {
        let overviewDescription = overview.size.x + 'x' + overview.size.y

        let metadata = overview.getMetadata()
        if (metadata['RESAMPLING'] === 'AVERAGE_BIT2') {
          overviewDescription += '*'
        }

        overviewInfo.push(overviewDescription)
      })

      if (overviewInfo.length > 0) {
        info += '  Overviews: ' + overviewInfo.join(', ') + '\n'
      }
      if (band.hasArbitraryOverviews) {
        info += '  Overviews: arbitrary' + '\n'
      }
      if (band.unitType) {
        info += '  Unit Type: ' + band.unitType + '\n'
      }

      // category names
      let categoryNames = band.categoryNames
      if (categoryNames.length > 0) {
        info += '  Category Names: ' + '\n'
        for (var i = 0; i < categoryNames.length; i++) {
          info += '    ' + i + ': ' + categoryNames[i] + '\n'
        }
      }

      if (band.scale !== 1 || band.offset !== 0) {
        info += '  Offset: ' + band.offset + ',   Scale: ' + band.scale + '\n'
      }

      // band metadata
      let metadata = band.getMetadata()
      let keys = Object.keys(metadata)
      if (keys.length > 0) {
        info += '  Metadata:' + '\n'
        keys.forEach(function (key) {
          info += '    ' + key + '=' + metadata[key] + '\n'
        })
      }

      metadata = band.getMetadata('IMAGE_STRUCTURE')
      keys = Object.keys(metadata)
      if (keys.length > 0) {
        info += '  Image Structure Metadata:' + '\n'
        keys.forEach(function (key) {
          info += '    ' + key + '=' + metadata[key] + '\n'
        })
      }
    })
    return info
  }
}
