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
import GeoTiffLayer from '../map/GeoTiffLayer'

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
    this.geotiff = await GeoTIFF.fromFile(this.configuration.file.path)
    this.image = await this.geotiff.getImage()
    const geoKeys = this.image.getGeoKeys()
    this.projection = geoKeys.GeographicTypeGeoKey || geoKeys.ProjectedCSTypeGeoKey

    this.conversion = proj4('EPSG:' + this.projection)

    let tiepoint = this.image.getTiePoints()[0]
    let pixelScale = this.image.getFileDirectory().ModelPixelScale
    this.geoTransform = [tiepoint.x, pixelScale[0], 0, tiepoint.y, 0, -1 * pixelScale[1]]
    this.invGeoTransform = [-this.geoTransform[0] / this.geoTransform[1], 1 / this.geoTransform[1], 0, -this.geoTransform[3] / this.geoTransform[5], 0, 1 / this.geoTransform[5]]

    let boundingBox = this.image.getBoundingBox()
    this.upperRight = this.conversion.inverse([boundingBox[2], boundingBox[3]])
    this.lowerLeft = this.conversion.inverse([boundingBox[0], boundingBox[1]])

    this.configuration.extent = [this.lowerLeft[0], this.lowerLeft[1], this.upperRight[0], this.upperRight[1]]
    this.configuration.projection = this.projection

    this.saveSource(this.configuration)
    return this
  }

  get mapLayer () {
    if (this.layer) return this.layer

    this.layer = new GeoTiffLayer({
      source: this,
      pane: 'tilePane'
    })
    return this.layer
  }

  async renderTile (coords, tile, done) {
    const sourceDir = userDataDir.dir(this.project.id).dir(this.sourceId)
    const tilePath = sourceDir.path(coords.z.toString(), coords.x.toString(), coords.y + '.tile')

    let ctx = tile.getContext('2d')
    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(coords.x, coords.y, coords.z)
    let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
    let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])

    if (!this.tileIntersects(tileUpperRight, tileLowerLeft, this.upperRight, this.lowerLeft)) {
      ctx.clearRect(0, 0, tile.width, tile.height)
      return done(null, tile)
    }
    console.log('Tile Intersects - start rendering')
    console.time('x ' + coords.x + ' y ' + coords.y + ' z ' + coords.z)

    let image = this.image
    let height = 256
    let width = 256

    let target = ctx.createImageData(tile.width, tile.height)
    let targetData = target.data
    if (jetpack.exists(tilePath)) {
      console.log('Tile Exists - Returning')
      let buffer = jetpack.read(tilePath, 'buffer')
      buffer.copy(targetData)
      ctx.clearRect(0, 0, tile.width, tile.height)
      ctx.putImageData(target, 0, 0)
      console.timeEnd('x ' + coords.x + ' y ' + coords.y + ' z ' + coords.z)

      setTimeout(() => {
        done(null, tile)
      }, 0)
      return
    }

    let tileHeightUnitsPerPixel = (tileBbox.maxLat - tileBbox.minLat) / height
    let tileWidthUnitsPerPixel = (tileBbox.maxLon - tileBbox.minLon) / width
    let sourcePixels = []
    let minxPixel = image.getWidth()
    let maxxPixel = 0
    let maxyPixel = 0
    let minyPixel = image.getHeight()

    for (let j = 0; j < tile.height; j++) {
      for (let i = 0; i < tile.width; i++) {
        let sourcePixelCoords = this.convertDestinationPixelToSource(this.conversion, j, i, tileBbox, this.geoTransform[0], this.geoTransform[3], tileHeightUnitsPerPixel, tileWidthUnitsPerPixel, this.invGeoTransform[5], this.invGeoTransform[1], image.getWidth(), image.getHeight())

        sourcePixels.push(sourcePixelCoords)
        minxPixel = Math.min(minxPixel, sourcePixelCoords.xPixel)
        maxxPixel = Math.max(maxxPixel, sourcePixelCoords.xPixel)
        minyPixel = Math.min(minyPixel, sourcePixelCoords.yPixel)
        maxyPixel = Math.max(maxyPixel, sourcePixelCoords.yPixel)
      }
    }

    minxPixel = Math.max(0, minxPixel - 1)
    minyPixel = Math.max(0, minyPixel - 1)
    maxxPixel = Math.min(image.getWidth(), maxxPixel + 1)
    maxyPixel = Math.min(image.getHeight(), maxyPixel + 1)

    let rasterWidth = Math.min(256, (maxxPixel - minxPixel))
    let rasterHeight = Math.min(256, (maxyPixel - minyPixel))

    if (image.getWidth() > image.getHeight()) {
      rasterWidth = rasterHeight * (image.getWidth() / image.getHeight())
    } else {
      rasterHeight = rasterWidth * (image.getHeight() / image.getWidth())
    }

    let scaleWidth = (maxxPixel - minxPixel) / rasterWidth
    let scaleHeight = (maxyPixel - minyPixel) / rasterHeight

    let raster = await image.readRGB({
      window: [minxPixel, minyPixel, maxxPixel, maxyPixel],
      width: rasterWidth,
      height: rasterHeight
    })
    let targetIndex = 0
    for (let sourcePixelCoord of sourcePixels) {
      if (sourcePixelCoord.xPixel >= 0 && sourcePixelCoord.xPixel <= image.getWidth() && sourcePixelCoord.yPixel >= 0 && sourcePixelCoord.yPixel <= image.getHeight()) {
        let actualX = Math.floor((sourcePixelCoord.xPixel - minxPixel) / scaleWidth)
        let actualY = Math.floor((sourcePixelCoord.yPixel - minyPixel) / scaleHeight)

        let sourcePixel = this.getPixelFromImage(raster, rasterWidth, actualX, actualY, 3)
        targetData[targetIndex++] = sourcePixel.r
        targetData[targetIndex++] = sourcePixel.g
        targetData[targetIndex++] = sourcePixel.b
        targetData[targetIndex++] = 255
      } else {
        targetIndex += 4
      }
    }

    ctx.clearRect(0, 0, tile.width, tile.height)
    ctx.putImageData(target, 0, 0)
    done(null, tile)
    console.timeEnd('x ' + coords.x + ' y ' + coords.y + ' z ' + coords.z)
    sourceDir.writeAsync(tilePath, Buffer.from(targetData))
  }

  tileIntersects (tileBboxUR, tileBboxLL, geotiffBboxUR, geotiffBboxLL) {
    let r2 = {
      left: tileBboxLL[0],
      right: tileBboxUR[0],
      top: tileBboxUR[1],
      bottom: tileBboxLL[1]
    }
    let r1 = {
      left: geotiffBboxLL[0],
      right: geotiffBboxUR[0],
      top: geotiffBboxUR[1],
      bottom: geotiffBboxLL[1]
    }

    return !(r2.left > r1.right ||
        r2.right < r1.left ||
        r2.top < r1.bottom ||
        r2.bottom > r1.top)
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
