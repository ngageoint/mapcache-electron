import proj4 from 'proj4'
// eslint-disable-next-line no-unused-vars
import * as d3 from 'd3'
// eslint-disable-next-line no-unused-vars
import * as d3Projection from 'd3-geo-projection'
import jetpack from 'fs-jetpack'
import { remote } from 'electron'
import * as TileBoundingBoxUtils from '../tile/tileBoundingBoxUtils'
import Source from './Source'
import * as GeoTIFF from 'geotiff'
import gdal from 'gdal'
import GeoTiffLayer from '../map/GeoTiffLayer'
import * as Vendor from '../vendor'

const userDataDir = jetpack.cwd(remote.app.getPath('userData'))
console.log('user data dir', userDataDir)

var defs = require('../projection/proj4Defs')
for (var name in defs) {
  if (defs[name]) {
    proj4.defs(name, defs[name])
  }
}

export default class GeoTiffSource extends Source {
  async initialize () {
    // I cannot get this to work with the node-gdal library, not sure why
    // gdalinfo /vsis3/landsat-pds/c1/L8/139/045/LC08_L1TP_139045_20170304_20170316_01_T1/LC08_L1TP_139045_20170304_20170316_01_T1_B8.TIF
    this.ds = gdal.open(this.configuration.file.path)
    gdalInfo(this.ds)

    this.geotiff = await GeoTIFF.fromFile(this.configuration.file.path)
    this.image = await this.geotiff.getImage()
    this.fileDirectory = this.image.fileDirectory
    this.photometricInterpretation = this.fileDirectory.PhotometricInterpretation
    if (this.photometricInterpretation === GeoTIFF.globals.photometricInterpretations.RGB) {
      this.srcBands = [1, 2, 3]
      this.dstBands = [1, 2, 3]
      this.dstAlphaBand = 4
    } else if (this.photometricInterpretation === GeoTIFF.globals.photometricInterpretations.Palette ||
    this.photometricInterpretation === GeoTIFF.globals.photometricInterpretations.BlackIsZero) {
      this.srcBands = [1]
      this.dstBands = [1]
      this.dstAlphaBand = 2
      this.colorMap = this.fileDirectory.ColorMap
    }

    this.createAndSaveConfigurationInformation()
    return this
  }

  createAndSaveConfigurationInformation () {
    if (!this.configuration.layers) {
      let corners = sourceCorners(this.ds)
      let ll = corners[3]
      let ur = corners[1]
      let polygon = new gdal.Polygon()
      let ring = new gdal.LinearRing()
      ring.points.add(ll[0], ll[1])
      ring.points.add(ur[0], ll[1])
      ring.points.add(ur[0], ur[1])
      ring.points.add(ll[0], ur[1])
      ring.points.add(ll[0], ll[1])
      polygon.rings.add(ring)

      let envelope = polygon.getEnvelope()

      let layerId = this.generateLayerId()
      let overviewTilePath = this.sourceCacheFolder.dir(layerId).path('overviewTile.png')

      this.configuration.layers = this.configuration.layers || [{
        id: layerId,
        type: 'tile',
        name: this.configuration.name,
        overviewTile: overviewTilePath,
        extent: [envelope.minX, envelope.minY, envelope.maxX, envelope.maxY],
        style: {
          opacity: 1
        }
      }]
    }
    this.renderOverviewTile()

    this.saveSource(this.configuration)
  }

  get mapLayer () {
    if (this.layer) return this.layer

    this.layer = new GeoTiffLayer({
      source: this,
      pane: 'tilePane'
    })
    this.layer.id = this.configuration.layers[0].id
    return this.layer
  }

  renderOverviewTile () {
    let overviewTilePath = this.configuration.layers[0].overviewTile
    if (!jetpack.exists(overviewTilePath)) {
      var fullExtent = this.configuration.layers[0].extent
      let coords = TileBoundingBoxUtils.determineXYZTileInsideExtent([fullExtent[0], fullExtent[1]], [fullExtent[2], fullExtent[3]])
      let canvas = Vendor.L.DomUtil.create('canvas')
      canvas.width = 500
      canvas.height = 500
      this.renderTile(coords, canvas, function (err, tile) {
        if (err) console.log('err', err)
        canvas.toBlob(function (blob) {
          var reader = new FileReader()
          reader.addEventListener('loadend', function () {
            jetpack.write(overviewTilePath, Buffer.from(reader.result))
          })
          reader.readAsArrayBuffer(blob)
        })
      })
    }

    // var fullExtent = this.configuration.layers[0].extent
    // let {width, height} = TileBoundingBoxUtils.determineImageDimensionsFromExtent([fullExtent[2], fullExtent[3]], [fullExtent[0], fullExtent[1]])
    //
    // let canvas = Vendor.L.DomUtil.create('canvas')
    // canvas.width = width
    // canvas.height = height
    // let ctx = canvas.getContext('2d')
    // ctx.clearRect(0, 0, width, height)
    // let target = ctx.createImageData(width, height)
    // let targetData = target.data
    // var tileCutline = createCutlineInProjection({west: fullExtent[0], south: fullExtent[1], east: fullExtent[2], north: fullExtent[3]}, gdal.SpatialReference.fromEPSG(3857))
    // var srcCutline = createPixelCoordinateCutline({west: fullExtent[0], south: fullExtent[1], east: fullExtent[2], north: fullExtent[3]}, this.ds)
    // let reprojectedFile = reproject(this.ds, 3857, tileCutline, srcCutline, this.srcBands, this.dstBands, this.dstAlphaBand)
    // this.populateTargetData(targetData, reprojectedFile, width, height)
    // reprojectedFile.close()
    // canvas.toBlob(function (blob) {
    //   console.log('blob', blob)
    //   var reader = new FileReader()
    //   reader.addEventListener('loadend', function () {
    //     console.log({overviewTilePath})
    //     jetpack.write(overviewTilePath, Buffer.from(reader.result))
    //   })
    // })
  }

  async renderTile (coords, tile, done) {
    let {x, y, z} = coords

    var gt = this.ds.geoTransform
    if (gt[2] !== 0 || gt[4] !== 0) {
      console.log('error the geotiff is skewed, need to warp first')
      return done()
    }

    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
    let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
    let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])
    var fullExtent = this.configuration.layers[0].extent
    if (!TileBoundingBoxUtils.tileIntersects(tileUpperRight, tileLowerLeft, [fullExtent[2], fullExtent[3]], [fullExtent[0], fullExtent[1]])) {
      return done(null, tile)
    }
    console.log('Tile Intersects - start rendering')
    console.time('x ' + coords.x + ' y ' + coords.y + ' z ' + coords.z)

    let ctx = tile.getContext('2d')
    ctx.clearRect(0, 0, tile.width, tile.height)

    let target = ctx.createImageData(tile.width, tile.height)
    let targetData = target.data

    var tileCutline = createCutlineInProjection({west: tileLowerLeft[0], south: tileLowerLeft[1], east: tileUpperRight[0], north: tileUpperRight[1]}, gdal.SpatialReference.fromEPSG(3857))
    var srcCutline = createPixelCoordinateCutline({west: fullExtent[0], south: fullExtent[1], east: fullExtent[2], north: fullExtent[3]}, this.ds)

    let reprojectedFile = reproject(this.ds, 3857, tileCutline, srcCutline, this.srcBands, this.dstBands, this.dstAlphaBand, tile.width, tile.height)

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
    if (this.photometricInterpretation === GeoTIFF.globals.photometricInterpretations.RGB) {
      let readOptions = {}
      let redBand = ds.bands.get(1).pixels.read(0, 0, width, height, null, readOptions)
      let greenBand = ds.bands.get(2).pixels.read(0, 0, width, height, null, readOptions)
      let blueBand = ds.bands.get(3).pixels.read(0, 0, width, height, null, readOptions)
      let alphaBand = ds.bands.get(4).pixels.read(0, 0, width, height, null, readOptions)

      for (let i = 0; i < redBand.length; i++) {
        targetData[i * 4] = redBand[i]
        targetData[(i * 4) + 1] = greenBand[i]
        targetData[(i * 4) + 2] = blueBand[i]
        targetData[(i * 4) + 3] = alphaBand[i]
      }
    } else if (this.photometricInterpretation === GeoTIFF.globals.photometricInterpretations.Palette) {
      let colorMap = this.colorMap
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
    } else if (this.photometricInterpretation === GeoTIFF.globals.photometricInterpretations.BlackIsZero) {
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

  convertDestinationPixelToSource (conversion, row, column, bbox, sourceImageMinLon, sourceImageMaxLat, tileHeightUnitsPerPixel, tileWidthUnitsPerPixel, invHeightUnitsPerPixel, invWidthUnitsPerPixel, sourceImageWidth, sourceImageHeight) {
    // get latitude longitude of destination pixel
    let latitude3857 = bbox.maxLat - (row * tileHeightUnitsPerPixel)
    let longitude3857 = bbox.minLon + (column * tileWidthUnitsPerPixel)

    let latlonProjected = proj4('EPSG:3857').inverse([longitude3857, latitude3857])

    // project that lat/lng to the source coordinate system
    var projected = conversion.forward(latlonProjected)
    var projectedLongitude = projected[0]
    var projectedLatitude = projected[1]

    // now find the source pixel
    var xPixel = Math.round((projectedLongitude - sourceImageMinLon) * invWidthUnitsPerPixel)
    var yPixel = Math.round((sourceImageMaxLat - projectedLatitude) * -1 * invHeightUnitsPerPixel)

    return {xPixel, yPixel}
  }

  getPixelFromImage (raster, imageWidth, x, y, bands) {
    return {
      r: raster[bands * (x + y * imageWidth)],
      g: raster[bands * (x + (y * imageWidth)) + 1],
      b: raster[bands * (x + (y * imageWidth)) + 2],
      a: 255
    }
  }
}

function createCutlineInProjection (envelope, srs) {
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

function createPixelCoordinateCutline (envelope, ds) {
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

function reproject (ds, epsgCode, tileCutline, srcCutline, srcBands, dstBands, dstAlphaBand, width, height) {
  console.log(arguments)
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

function sourceCorners (ds) {
  let size = ds.rasterSize
  let geotransform = ds.geoTransform

  // corners
  let corners = {
    'Upper Left  ': {x: 0, y: 0},
    'Upper Right ': {x: size.x, y: 0},
    'Bottom Right': {x: size.x, y: size.y},
    'Bottom Left ': {x: 0, y: size.y}
  }

  let wgs84 = gdal.SpatialReference.fromEPSG(4326)
  let coordTransform = new gdal.CoordinateTransformation(ds.srs, wgs84)

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
    coordinateCorners.push([ptWgs84.x, ptWgs84.y])
  })

  coordinateCorners.push([coordinateCorners[0][0], coordinateCorners[0][1]])
  return coordinateCorners
}

function gdalInfo (ds) {
  console.log('number of bands: ' + ds.bands.count())
  let size = ds.rasterSize
  if (ds.rasterSize) {
    console.log('width: ' + ds.rasterSize.x)
    console.log('height: ' + ds.rasterSize.y)
  }
  let geotransform = ds.geoTransform
  if (geotransform) {
    console.log('Origin = (' + geotransform[0] + ', ' + geotransform[3] + ')')
    console.log('Pixel Size = (' + geotransform[1] + ', ' + geotransform[5] + ')')
    console.log('GeoTransform =')
    console.log(geotransform)
  }

  let layer = ds.layers
  console.log('DataSource Layer Count', layer.count())
  for (var i = 0; i < layer.count(); i++) {
    console.log('Layer %d:', i, layer.get(i))
  }

  console.log('srs: ' + (ds.srs ? ds.srs.toPrettyWKT() : 'null'))
  if (!ds.srs) return
  // corners
  let corners = {
    'Upper Left  ': {x: 0, y: 0},
    'Upper Right ': {x: size.x, y: 0},
    'Bottom Right': {x: size.x, y: size.y},
    'Bottom Left ': {x: 0, y: size.y}
  }

  let wgs84 = gdal.SpatialReference.fromEPSG(4326)
  let coordTransform = new gdal.CoordinateTransformation(ds.srs, wgs84)

  console.log('Corner Coordinates:')
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
    console.log('%s (%d, %d) (%s, %s)',
      cornerName,
      Math.floor(ptOrig.x * 100) / 100,
      Math.floor(ptOrig.y * 100) / 100,
      gdal.decToDMS(ptWgs84.x, 'Long'),
      gdal.decToDMS(ptWgs84.y, 'Lat')
    )
    coordinateCorners.push([ptWgs84.x, ptWgs84.y])
  })

  ds.bands.forEach(function (band) {
    console.log('Band %d Block=%d%d Type=%s, ColorInterp=%s',
      band.id,
      band.blocksize ? band.blocksize.x : 0,
      band.blocksize ? band.blocksize.y : 0,
      band.dataType,
      band.colorInterpretation)

    if (band.description) {
      console.log('  Description = ' + band.description)
    }
    console.log('  Min=' + Math.floor(band.minimum * 1000) / 1000)
    console.log('  Max=' + Math.floor(band.maximum * 1000) / 1000)
    if (band.noDataValue !== null) {
      console.log('  NoData Value=' + band.noDataValue)
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
      console.log('  Overviews: ' + overviewInfo.join(', '))
    }
    if (band.hasArbitraryOverviews) {
      console.log('  Overviews: arbitrary')
    }
    if (band.unitType) {
      console.log('  Unit Type: ' + band.unitType)
    }

    // category names
    let categoryNames = band.categoryNames
    if (categoryNames.length > 0) {
      console.log('  Category Names: ')
      for (var i = 0; i < categoryNames.length; i++) {
        console.log('    ' + i + ': ' + categoryNames[i])
      }
    }

    if (band.scale !== 1 || band.offset !== 0) {
      console.log('  Offset: ' + band.offset + ',   Scale: ' + band.scale)
    }

    // band metadata
    let metadata = band.getMetadata()
    let keys = Object.keys(metadata)
    if (keys.length > 0) {
      console.log('  Metadata:')
      keys.forEach(function (key) {
        console.log('    ' + key + '=' + metadata[key])
      })
    }

    metadata = band.getMetadata('IMAGE_STRUCTURE')
    keys = Object.keys(metadata)
    if (keys.length > 0) {
      console.log('  Image Structure Metadata:')
      keys.forEach(function (key) {
        console.log('    ' + key + '=' + metadata[key])
      })
    }
  })
};
