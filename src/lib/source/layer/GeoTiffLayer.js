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
  colorMap
  stretchToMinMax
  renderingMethod
  grayScaleColorGradient
  redBand
  redBandMin
  redBandMax
  greenBand
  greenBandMin
  greenBandMax
  blueBand
  blueBandMin
  blueBandMax
  grayBand
  grayBandMin
  grayBandMax
  paletteBand
  alphaBand
  enableGlobalNoDataValue
  globalNoDataValue
  bandOptions

  static getMaxForDataType (datatype) {
    let max = 255
    if (datatype === gdal.GDT_UInt16) {
      max = 65535
    }
    return max
  }

  getColorInterpretationNum (colorInterpretation) {
    let colorInterpNum = 0
    if (colorInterpretation !== undefined && colorInterpretation !== null) {
      if (colorInterpretation === 1 || colorInterpretation === '1' || colorInterpretation.toUpperCase() === 'GRAY' || colorInterpretation.toUpperCase() === 'GREY') {
        colorInterpNum = 1
      } else if (colorInterpretation === 2 || colorInterpretation === '2' || colorInterpretation.toUpperCase() === 'PALETTE' || colorInterpretation.toUpperCase() === 'PALETTED') {
        colorInterpNum = 2
      } else if (colorInterpretation === 3 || colorInterpretation === '3' || colorInterpretation.toUpperCase() === 'RED') {
        colorInterpNum = 3
      } else if (colorInterpretation === 4 || colorInterpretation === '4' || colorInterpretation.toUpperCase() === 'GREEN') {
        colorInterpNum = 4
      } else if (colorInterpretation === 5 || colorInterpretation === '5' || colorInterpretation.toUpperCase() === 'BLUE') {
        colorInterpNum = 5
      } else if (colorInterpretation === 6 || colorInterpretation === '6' || colorInterpretation.toUpperCase() === 'ALPHA') {
        colorInterpNum = 6
      }
    }
    return colorInterpNum
  }

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
    if (this._configuration.bandOptions) {
      this._extent = this._configuration.extent
      this.stretchToMinMax = this._configuration.stretchToMinMax
      this.renderingMethod = this._configuration.renderingMethod
      // rgb options
      this.redBand = this._configuration.redBand
      this.redBandMin = this._configuration.redBandMin
      this.redBandMax = this._configuration.redBandMax
      this.greenBand = this._configuration.greenBand
      this.greenBandMin = this._configuration.greenBandMin
      this.greenBandMax = this._configuration.greenBandMax
      this.blueBand = this._configuration.blueBand
      this.blueBandMin = this._configuration.blueBandMin
      this.blueBandMax = this._configuration.blueBandMax
      // grey scale options
      this.grayScaleColorGradient = this._configuration.grayScaleColorGradient
      this.grayBand = this._configuration.grayBand
      this.grayBandMin = this._configuration.grayBandMin
      this.grayBandMax = this._configuration.grayBandMax
      // palette options
      this.paletteBand = this._configuration.paletteBand
      // alpha options
      this.alphaBand = this._configuration.alphaBand
      this.globalNoDataValue = this._configuration.globalNoDataValue
      this.enableGlobalNoDataValue = this._configuration.enableGlobalNoDataValue
      // available bands to assign
      this.bandOptions = this._configuration.bandOptions
    } else {
      this.enableGlobalNoDataValue = false
      this.redBand = 0
      this.greenBand = 0
      this.blueBand = 0
      this.grayBand = 0
      this.paletteBand = 0
      this.alphaBand = 0
      this.grayScaleColorGradient = 1
      this.bandOptions = [{
        value: 0,
        name: 'No Band'
      }]
      for (let i = 1; i <= this.ds.bands.count(); i++) {
        let band = this.ds.bands.get(i)
        let name = 'Band ' + i
        if (this.getColorInterpretationNum(band.colorInterpretation) !== 0) {
          name += ' (' + band.colorInterpretation + ')'
        }
        let min = band.minimum || 0
        let max = band.maximum || GeoTiffLayer.getMaxForDataType(band.dataType)
        this.bandOptions.push({
          value: i,
          name: name,
          min,
          max
        })
        // don't really care if they are different, can disable use of global no data
        if (band.noDataValue !== undefined && band.noDataValue !== null) {
          this.globalNoDataValue = band.noDataValue
          this.enableGlobalNoDataValue = true
        }
      }
      // determine initial rendering method
      if (this.photometricInterpretation === 3) {
        this.renderingMethod = 2
        // this is the default
        this.paletteBand = 1
        for (let i = 1; i <= this.ds.bands.count(); i++) {
          let band = this.ds.bands.get(i)
          if (this.getColorInterpretationNum(band.colorInterpretation) === 2) {
            this.paletteBand = i
          } else if (this.getColorInterpretationNum(band.colorInterpretation) === 6) {
            let prevAlphaBand = this.alphaBand
            this.alphaBand = i
            if (this.paletteBand === this.alphaBand) {
              this.paletteBand = prevAlphaBand
            }
          }
        }
      } else if (this.samplesPerPixel >= 3 || this.photometricInterpretation === 2) {
        this.renderingMethod = 1
        // this is the default
        this.redBand = 1
        this.greenBand = 2
        this.blueBand = 3
        // check if these bands have a color interp assigned, if so, reorder appropriately
        for (let i = 1; i <= this.ds.bands.count(); i++) {
          let band = this.ds.bands.get(i)
          if (this.getColorInterpretationNum(band.colorInterpretation) === 3) {
            let prevRedBand = this.redBand
            this.redBand = i
            if (this.greenBand === this.redBand) {
              this.greenBand = prevRedBand
            } else if (this.blueBand === this.redBand) {
              this.blueBand = prevRedBand
            }
          } else if (this.getColorInterpretationNum(band.colorInterpretation) === 4) {
            let prevGreenBand = this.greenBand
            this.greenBand = i
            if (this.redBand === this.greenBand) {
              this.redBand = prevGreenBand
            } else if (this.blueBand === this.greenBand) {
              this.blueBand = prevGreenBand
            }
          } else if (this.getColorInterpretationNum(band.colorInterpretation) === 5) {
            let prevBlueBand = this.blueBand
            this.blueBand = i
            if (this.redBand === this.blueBand) {
              this.redBand = prevBlueBand
            } else if (this.greenBand === this.blueBand) {
              this.greenBand = prevBlueBand
            }
          } else if (this.getColorInterpretationNum(band.colorInterpretation) === 6) {
            let prevAlphaBand = this.alphaBand
            this.alphaBand = i
            if (this.redBand === this.alphaBand) {
              this.redBand = prevAlphaBand
            } else if (this.greenBand === this.alphaBand) {
              this.greenBand = prevAlphaBand
            } else if (this.blueBand === this.alphaBand) {
              this.blueBand = prevAlphaBand
            }
          }
        }
        this.redBandMin = this.bandOptions[this.redBand].min
        this.redBandMax = this.bandOptions[this.redBand].max
        this.greenBandMin = this.bandOptions[this.greenBand].min
        this.greenBandMax = this.bandOptions[this.greenBand].max
        this.blueBandMin = this.bandOptions[this.blueBand].min
        this.blueBandMax = this.bandOptions[this.blueBand].max
      } else if (this.samplesPerPixel === 1 || this.ds.bands.count() === 1 || this.photometricInterpretation <= 1) {
        this.renderingMethod = 0
        this.grayScaleColorGradient = this.photometricInterpretation
        // this is the default
        this.grayBand = 1
        for (let i = 1; i <= this.ds.bands.count(); i++) {
          let band = this.ds.bands.get(i)
          if (this.getColorInterpretationNum(band.colorInterpretation) === 1) {
            this.grayBand = i
          } else if (this.getColorInterpretationNum(band.colorInterpretation) === 6) {
            let prevAlphaBand = this.alphaBand
            this.alphaBand = i
            if (this.grayBand === this.alphaBand) {
              this.grayBand = prevAlphaBand
            }
          }
        }
        this.grayBandMin = this.bandOptions[this.grayBand].min
        this.grayBandMax = this.bandOptions[this.grayBand].max
      } else {
        this.photometricInterpretation = 1
      }
      // should we enable stretch to min max by default
      let shouldStretch = true
      for (let i = 1; i <= this.ds.bands.count(); i++) {
        let band = this.ds.bands.get(i)
        if (!band.minimum || !band.maximum) {
          shouldStretch = true
        }
      }
      this.stretchToMinMax = shouldStretch
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
      photometricInterpretation: this.photometricInterpretation,
      samplesPerPixel: this.samplesPerPixel,
      bitsPerSample: this.bitsPerSample,
      colorMap: this.colorMap,
      info: this.gdalInfo(this.ds, this.image),
      shown: this.shown || true,
      stretchToMinMax: this.stretchToMinMax,
      renderingMethod: this.renderingMethod,
      redBand: this.redBand,
      redBandMin: this.redBandMin,
      redBandMax: this.redBandMax,
      greenBand: this.greenBand,
      greenBandMin: this.greenBandMin,
      greenBandMax: this.greenBandMax,
      blueBand: this.blueBand,
      blueBandMin: this.blueBandMin,
      blueBandMax: this.blueBandMax,
      grayScaleColorGradient: this.grayScaleColorGradient,
      grayBand: this.grayBand,
      grayBandMin: this.grayBandMin,
      grayBandMax: this.grayBandMax,
      alphaBand: this.alphaBand,
      paletteBand: this.paletteBand,
      bandOptions: this.bandOptions,
      globalNoDataValue: this.globalNoDataValue,
      enableGlobalNoDataValue: this.enableGlobalNoDataValue
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
