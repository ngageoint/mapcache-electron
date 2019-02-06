import jetpack from 'fs-jetpack'
import TileBoundingBoxUtils from '../../tile/tileBoundingBoxUtils'
import GeoTiffRenderer from './renderer/GeoTiffRenderer'
import MapcacheMapLayer from '../../map/MapcacheMapLayer'
import Layer from './Layer'
import * as GeoTIFF from 'geotiff'
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
  dstBands
  dstAlphaBand
  colorMap

  async initialize () {
    console.log('opening', this.filePath)

    // I cannot get this to work with the node-gdal library, not sure why
    // gdalinfo /vsis3/landsat-pds/c1/L8/139/045/LC08_L1TP_139045_20170304_20170316_01_T1/LC08_L1TP_139045_20170304_20170316_01_T1_B8.TIF
    this.ds = gdal.open(this.filePath)
    // gdalInfo(this.ds)

    this.geotiff = await GeoTIFF.fromFile(this.filePath)
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

    this._extent = this.extent
    this.renderer = new GeoTiffRenderer(this)

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
      pane: 'overlayPane',
      layerType: 'GeoTIFF',
      overviewTilePath: this.overviewTilePath,
      style: this.style,
      srcBands: this.srcBands,
      dstBands: this.dstBands,
      dstAlphaBand: this.dstAlphaBand,
      photometricInterpretation: this.photometricInterpretation,
      info: this.gdalInfo(this.ds),
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
    if (this._mapLayer) return [this._mapLayer]

    this._mapLayer = new MapcacheMapLayer({
      layer: this,
      pane: this.configuration.pane
    })

    this._mapLayer.id = this.id
    return [this._mapLayer]
  }

  async renderTile (coords, tileCanvas, done) {
    await this.renderer.renderTile(coords, tileCanvas, done)
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

  gdalInfo (ds) {
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
