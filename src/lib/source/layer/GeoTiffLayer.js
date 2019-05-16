import jetpack from 'fs-jetpack'
import TileBoundingBoxUtils from '../../tile/tileBoundingBoxUtils'
import GeoTiffRenderer from './renderer/GeoTiffRenderer'
import MapcacheMapLayer from '../../map/MapcacheMapLayer'
import Layer from './Layer'
import * as GeoTIFF from 'geotiff'
import * as GeoTIFFGlobals from 'geotiff/src/globals'
import gdal from 'gdal'
import * as Vendor from '../../vendor'

export default class GeoTiffLayer extends Layer {
  _extent
  _style
  geotiff
  image
  fileDirectory
  photometricInterpretation
  srcBands
  dstAlphaBand
  srcAlphaBand
  colorMap

  async initialize () {
    console.log('opening in geotiff layer', this.filePath)
    // I cannot get this to work with the node-gdal library, not sure why
    // gdalinfo /vsis3/landsat-pds/c1/L8/139/045/LC08_L1TP_139045_20170304_20170316_01_T1/LC08_L1TP_139045_20170304_20170316_01_T1_B8.TIF
    this.geotiff = await GeoTIFF.fromFile(this.filePath)
    this.image = await this.geotiff.getImage()
    this.fileDirectory = this.image.fileDirectory
    this.photometricInterpretation = this.fileDirectory.PhotometricInterpretation
    this.samplesPerPixel = this.fileDirectory.SamplesPerPixel
    this.bitsPerSample = this.fileDirectory.BitsPerSample
    this.ds = gdal.open(this.filePath)
    this.colorMap = this.fileDirectory.ColorMap
    console.log(this.gdalInfo(this.ds, this.image))
    if (this._configuration.srcBands) {
      this.srcBands = this._configuration.srcBands
      this.srcAlphaBand = this._configuration.srcAlphaBand
      this.dstAlphaBand = this._configuration.dstAlphaBand
      this.dstRedBand = this._configuration.dstRedBand
      this.dstGreenBand = this._configuration.dstGreenBand
      this.dstBlueBand = this._configuration.dstBlueBand
      this._extent = this._configuration.extent
    } else {
      this.srcBands = []
      // when photometric interpretation is RGB, we can adjust bands
      if (this.photometricInterpretation === 2 || this.samplesPerPixel >= 3) {
        this.srcBands = [1, 2, 3]
        this.dstRedBand = 1
        this.dstGreenBand = 2
        this.dstBlueBand = 3
        if (this.ds.bands.count() === 4) {
          this.srcBands.push(4)
          this.srcAlphaBand = 4
          this.dstAlphaBand = 4
        }
      } else {
        for (let i = 1; i <= this.samplesPerPixel; i++) {
          this.srcBands.push(i)
        }
      }
      this._extent = this.extent
    }
    this.renderer = new GeoTiffRenderer(this)
    // console.log('this.dstGreenBand', this.dstGreenBand)
    this.renderOverviewTile()
    return this
  }

  get configuration () {
    return {
      filePath: this.filePath,
      sourceLayerName: this.sourceLayerName,
      name: this.name,
      extent: this.extent,
      id: this.id,
      pane: 'tile',
      layerType: 'GeoTIFF',
      overviewTilePath: this.overviewTilePath,
      style: this.style,
      srcBands: this.srcBands,
      dstRedBand: this.dstRedBand,
      dstBlueBand: this.dstBlueBand,
      dstGreenBand: this.dstGreenBand,
      dstAlphaBand: this.dstAlphaBand,
      srcAlphaBand: this.srcAlphaBand,
      photometricInterpretation: this.photometricInterpretation,
      samplesPerPixel: this.samplesPerPixel,
      bitsPerSample: this.bitsPerSample,
      colorMap: this.colorMap,
      info: this.gdalInfo(this.ds, this.image),
      shown: this.shown || true
    }
  }

  get extent () {
    if (this._configuration.extent) {
      return this._configuration.extent
    }
    let corners = this.sourceCorners(this.ds)
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
    this._configuration.extent = [envelope.minX, envelope.minY, envelope.maxX, envelope.maxY]
    return this._configuration.extent
  }

  get style () {
    this._style = this._style || {
      opacity: 1
    }
    return this._style
  }

  get mapLayer () {
    if (this._mapLayer) return this._mapLayer

    this._mapLayer = new MapcacheMapLayer({
      layer: this,
      pane: this.configuration.panet === 'tile' ? 'tilePane' : 'overlayPane'
    })

    this._mapLayer.id = this.id
    return this._mapLayer
  }

  async renderTile (coords, tileCanvas, done) {
    return this.renderer.renderTile(coords, tileCanvas, done)
  }

  async renderImageryTile (coords, tileCanvas, done) {
    return this.renderTile(coords, tileCanvas, done)
  }

  renderOverviewTile () {
    let overviewTilePath = this.overviewTilePath
    if (!jetpack.exists(overviewTilePath)) {
      var fullExtent = this.extent
      let coords = TileBoundingBoxUtils.determineXYZTileInsideExtent([fullExtent[0], fullExtent[1]], [fullExtent[2], fullExtent[3]])
      let canvas = Vendor.L.DomUtil.create('canvas')
      canvas.width = 500
      canvas.height = 500
      this.renderer.renderTile(coords, canvas, function (err, tile) {
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
  }

  sourceCorners (ds) {
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

    if (image) {
      info += 'FileDirectory\n'
      for (let key in image.fileDirectory) {
        let varName = key.charAt(0).toLowerCase() + key.slice(1) + 's'
        let globals = GeoTIFFGlobals[varName]
        if (globals) {
          for (const globalKey in globals) {
            let globalValue = globals[globalKey]
            if (globalValue === image.fileDirectory[key]) {
              info += '\t' + key + ': ' + globalKey + ' (' + image.fileDirectory[key] + ')\n'
            }
          }
        } else if (key !== 'StripOffsets' && key !== 'StripByteCounts') {
          info += '\t' + key + ': ' + image.fileDirectory[key] + '\n'
        }
        // JSON.stringify(image.fileDirectory, null, 2)
      }
    }

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
