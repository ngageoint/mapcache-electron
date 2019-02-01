import TileBoundingBoxUtils from '../../../tile/tileBoundingBoxUtils'
import proj4 from 'proj4'
import gdal from 'gdal'
import * as GeoTIFF from 'geotiff'

var defs = require('../../../projection/proj4Defs')
for (var name in defs) {
  if (defs[name]) {
    proj4.defs(name, defs[name])
  }
}

export default class GeoTiffRenderer {
  layer
  constructor (geoTiffLayer) {
    this.layer = geoTiffLayer
  }

  async renderTile (coords, tile, done) {
    let {x, y, z} = coords

    var gt = this.layer.ds.geoTransform
    if (gt[2] !== 0 || gt[4] !== 0) {
      console.log('error the geotiff is skewed, need to warp first')
      return done()
    }

    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
    let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
    let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])
    var fullExtent = this.layer.extent
    if (!TileBoundingBoxUtils.tileIntersects(tileUpperRight, tileLowerLeft, [fullExtent[2], fullExtent[3]], [fullExtent[0], fullExtent[1]])) {
      return done(null, tile)
    }
    console.log('Tile Intersects - start rendering')
    console.time('x ' + coords.x + ' y ' + coords.y + ' z ' + coords.z)
    console.log('tile', tile)

    let ctx = tile.getContext('2d')
    ctx.clearRect(0, 0, tile.width, tile.height)

    let target = ctx.createImageData(tile.width, tile.height)
    let targetData = target.data

    var tileCutline = this.createCutlineInProjection({west: tileLowerLeft[0], south: tileLowerLeft[1], east: tileUpperRight[0], north: tileUpperRight[1]}, gdal.SpatialReference.fromEPSG(3857))
    var srcCutline = this.createPixelCoordinateCutline({west: fullExtent[0], south: fullExtent[1], east: fullExtent[2], north: fullExtent[3]}, this.layer.ds)

    let reprojectedFile = this.reproject(this.layer.ds, 3857, tileCutline, srcCutline, this.layer.srcBands, this.layer.dstBands, this.layer.dstAlphaBand, tile.width, tile.height)

    this.populateTargetData(targetData, reprojectedFile, tile.width, tile.height)

    reprojectedFile.close()

    ctx.clearRect(0, 0, tile.width, tile.height)
    ctx.putImageData(target, 0, 0)
    setTimeout(() => {
      done(null, tile)
    }, 0)
    console.timeEnd('x ' + x + ' y ' + y + ' z ' + z)
  }

  populateTargetData (targetData, ds, width, height) {
    if (this.layer.photometricInterpretation === GeoTIFF.globals.photometricInterpretations.RGB) {
      let readOptions = {}
      let redBand = ds.bands.get(1).pixels.read(0, 0, width, height, null, readOptions)
      let greenBand = ds.bands.get(2).pixels.read(0, 0, width, height, null, readOptions)
      let blueBand = ds.bands.get(3).pixels.read(0, 0, width, height, null, readOptions)
      let alphaBand = ds.bands.get(4).pixels.read(0, 0, width, height, null, readOptions)
      console.log({targetData})
      for (let i = 0; i < redBand.length; i++) {
        targetData[i * 4] = redBand[i]
        targetData[(i * 4) + 1] = greenBand[i]
        targetData[(i * 4) + 2] = blueBand[i]
        targetData[(i * 4) + 3] = alphaBand[i]
      }
    } else if (this.layer.photometricInterpretation === GeoTIFF.globals.photometricInterpretations.Palette) {
      let colorMap = this.layer.colorMap
      let readOptions = {}
      let colorBand = ds.bands.get(1).pixels.read(0, 0, width, height, null, readOptions)
      let alphaBand = ds.bands.get(2).pixels.read(0, 0, width, height, null, readOptions)
      colorBand.width = width
      colorBand.height = height

      let paletted = GeoTIFF.rgb.fromPalette(colorBand, colorMap)
      for (let i = 0, p = 0; i < colorBand.length; i++) {
        let r = paletted[p++]
        let g = paletted[p++]
        let b = paletted[p++]
        let a = alphaBand[i]
        targetData[i * 4] = r
        targetData[(i * 4) + 1] = g
        targetData[(i * 4) + 2] = b
        targetData[(i * 4) + 3] = a
      }
    } else if (this.layer.photometricInterpretation === GeoTIFF.globals.photometricInterpretations.BlackIsZero) {
      let readOptions = {}
      let greyBand = ds.bands.get(1).pixels.read(0, 0, width, height, null, readOptions)
      let alphaBand = ds.bands.get(2).pixels.read(0, 0, width, height, null, readOptions)
      greyBand.width = width
      greyBand.height = height

      for (let i = 0; i < greyBand.length; i++) {
        targetData[i * 4] = greyBand[i]
        targetData[(i * 4) + 1] = greyBand[i]
        targetData[(i * 4) + 2] = greyBand[i]
        targetData[(i * 4) + 3] = alphaBand[i]
      }
    }
  }

  // convertDestinationPixelToSource (conversion, row, column, bbox, sourceImageMinLon, sourceImageMaxLat, tileHeightUnitsPerPixel, tileWidthUnitsPerPixel, invHeightUnitsPerPixel, invWidthUnitsPerPixel, sourceImageWidth, sourceImageHeight) {
  //   // get latitude longitude of destination pixel
  //   let latitude3857 = bbox.maxLat - (row * tileHeightUnitsPerPixel)
  //   let longitude3857 = bbox.minLon + (column * tileWidthUnitsPerPixel)
  //
  //   let latlonProjected = proj4('EPSG:3857').inverse([longitude3857, latitude3857])
  //
  //   // project that lat/lng to the source coordinate system
  //   var projected = conversion.forward(latlonProjected)
  //   var projectedLongitude = projected[0]
  //   var projectedLatitude = projected[1]
  //
  //   // now find the source pixel
  //   var xPixel = Math.round((projectedLongitude - sourceImageMinLon) * invWidthUnitsPerPixel)
  //   var yPixel = Math.round((sourceImageMaxLat - projectedLatitude) * -1 * invHeightUnitsPerPixel)
  //
  //   return {xPixel, yPixel}
  // }
  //
  // getPixelFromImage (raster, imageWidth, x, y, bands) {
  //   return {
  //     r: raster[bands * (x + y * imageWidth)],
  //     g: raster[bands * (x + (y * imageWidth)) + 1],
  //     b: raster[bands * (x + (y * imageWidth)) + 2],
  //     a: 255
  //   }
  // }

  reproject (ds, epsgCode, tileCutline, srcCutline, srcBands, dstBands, dstAlphaBand, width, height) {
    // colored-infrared bands = [4, 1, 2]
    // RGB bands = [1, 2, 3]
    var tileExtent = tileCutline.getEnvelope()
    var targetSrs = gdal.SpatialReference.fromEPSG(epsgCode)

    var gt = ds.geoTransform

    var tr = {
      x: Math.max(tileExtent.maxX - tileExtent.minX) / width,
      y: Math.max(tileExtent.maxY - tileExtent.minY) / height
    }

    var destination = gdal.open('memory', 'w', 'MEM', width, height, 4)
    destination.srs = targetSrs
    destination.geoTransform = [
      tileExtent.minX, tr.x, gt[2],
      tileExtent.maxY, gt[4], -tr.y
    ]
    gdal.reprojectImage({
      src: ds,
      dst: destination,
      s_srs: ds.srs, // jshint ignore:line
      t_srs: targetSrs, // jshint ignore:line
      cutline: srcCutline,
      dstAlphaBand,
      srcBands,
      dstBands
    })

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
}
