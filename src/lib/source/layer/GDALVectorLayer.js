import jetpack from 'fs-jetpack'
import Layer from './Layer'
import MapcacheMapLayer from '../../map/MapcacheMapLayer'
import gdal from 'gdal'
import path from 'path'
import proj4 from 'proj4'
import geojsonvt from 'geojson-vt'
import * as vtpbf from 'vt-pbf'
import TileBoundingBoxUtils from '../../tile/tileBoundingBoxUtils'
import VectorTileRenderer from './renderer/VectorTileRenderer'

export default class GDALVectorLayer extends Layer {
  _vectorTileRenderer

  async initialize () {
    this.openGdalFile()
    if (this.layer.name.startsWith('OGR')) {
      this.name = path.basename(this.filePath, path.extname(this.filePath))
    } else {
      this.name = this.layer.name
    }
    this.removeMultiFeatures()

    let name = this.name
    let extent = this.extent
    let layer = this.layer

    this._vectorTileRenderer = new VectorTileRenderer(this.style, this.name, (x, y, z, map) => {
      return this.getTile({x: x, y: y, z: z}, map, layer, extent, name)
    }, this._configuration.images)

    await this._vectorTileRenderer.init()
    await this.renderOverviewTile()

    return this
  }

  openGdalFile () {
    gdal.config.set('OGR_ENABLE_PARTIAL_REPROJECTION', 'YES')
    this.dataset = gdal.open(this.filePath)
    this.layer = this.dataset.layers.get(this.sourceLayerName)
  }

  removeMultiFeatures () {
    let expanded = false
    let fileName = this.name + '.geojson'
    let filePath = this.cacheFolder.dir(this.id).file(fileName).path()
    let fullFile = path.join(filePath, fileName)
    if (fullFile === this.filePath) {
      return
    }
    let outds = gdal.open(fullFile, 'w', 'GeoJSON')
    let outLayer = outds.layers.create(this.sourceLayerName, this.layer.srs, gdal.wkbPolygon)
    this.layer.features.forEach(feature => {
      let geom = feature.getGeometry()
      if (geom.name === 'MULTIPOLYGON' || geom.name === 'MULTILINESTRING') {
        let children = geom.children
        children.forEach((child, i) => {
          let newFeature = feature.clone()
          newFeature.setGeometry(child)
          outLayer.features.add(newFeature)
          expanded = true
        })
      } else {
        outLayer.features.add(feature)
      }
    })
    outds.close()
    if (expanded) {
      this.filePath = fullFile
      this.openGdalFile()
    } else {
      this.cacheFolder.dir(this.id).remove()
    }
  }

  get configuration () {
    return {
      filePath: this.filePath,
      sourceLayerName: this.sourceLayerName,
      name: this.name,
      extent: this.extent,
      id: this.id,
      pane: 'vector',
      layerType: 'GDALVector',
      overviewTilePath: this.overviewTilePath,
      style: this.style,
      count: this.layer.features.count(),
      shown: this.shown || true,
      mbStyle: this.mbStyle,
      images: this._configuration.images
    }
  }

  get extent () {
    let wgs84 = gdal.SpatialReference.fromEPSG(4326)

    let toNative = new gdal.CoordinateTransformation(this.layer.srs, wgs84)
    let extentPoly = this.layer.getExtent().toPolygon()
    extentPoly.transform(toNative)
    let currentEnvelope = extentPoly.getEnvelope()

    return [currentEnvelope.minX, currentEnvelope.minY, currentEnvelope.maxX, currentEnvelope.maxY]
  }

  generateColor () {
    let color = '#' + Math.floor(Math.random() * 16777215).toString(16)
    return color.padEnd(7, '0')
  }

  get style () {
    let color = this.generateColor()
    let fillColor = this.generateColor()

    this._style = this._style || {
      weight: 2,
      radius: 2,
      color: color,
      opacity: 1,
      fillColor: fillColor,
      fillOpacity: 0.5,
      fill: false
    }
    return this._style
  }

  async renderTile (coords, tileCanvas, done) {
    this._vectorTileRenderer.renderVectorTile(coords, tileCanvas, done)
  }

  get mapLayer () {
    if (this._mapLayer) return this._mapLayer

    this._mapLayer = new MapcacheMapLayer({
      layer: this,
      pane: 'overlayPane'
    })

    this._mapLayer.id = this.id
    return this._mapLayer
  }

  renderOverviewTile () {
    let overviewTilePath = this.overviewTilePath
    if (jetpack.exists(this.overviewTilePath)) return
    this.renderTile({x: 0, y: 0, z: 0}, null, function (err, imageData) {
      if (err) throw err
      jetpack.write(overviewTilePath, imageData)
    })
  }

  createStyle (type, id, paint) {
    let geomTypes = []
    if (type === 'fill') {
      geomTypes.push('Polygon')
      geomTypes.push('MultiPolygon')
    }
    return {
      'id': type + '-style-' + id,
      'type': type,
      'source': this.name,
      'source-layer': this.name,
      'filter': ['match', ['geometry-type'], geomTypes, true, false],
      'paint': paint
      // {
      //   'fill-color': this.style.fillColor,
      //   'fill-opacity': this.style.fillOpacity
      // }
    }
  }

  getTile (coords, map, gdalLayer, extent, name) {
    return new Promise((resolve, reject) => {
      let {x, y, z} = coords

      let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
      let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
      let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])

      if (!TileBoundingBoxUtils.tileIntersects(tileUpperRight, tileLowerLeft, [extent[2], extent[3]], [extent[0], extent[1]])) {
        return resolve(this.emptyVectorTile(name))
      }

      console.time('x ' + x + ' y ' + y + ' z ' + z)
      let features = []
      let featureCollection = {
        type: 'FeatureCollection',
        features: features
      }

      let featureMap = this.iterateFeaturesInBounds([
        [tileLowerLeft[1], tileLowerLeft[0]],
        [tileUpperRight[1], tileUpperRight[0]]
      ], true)

      console.log('featureMap.length', featureMap.length)
      for (let i = 0; i < featureMap.length; i++) {
        let feature = featureMap[i]
        if (feature) {
          // console.log('feature', feature)
          features.push(feature)
        }
      }

      let tileBuffer = 8
      let tileIndex = geojsonvt(featureCollection, {buffer: tileBuffer * 8, maxZoom: z})
      var tile = tileIndex.getTile(z, x, y)

      var gjvt = {}
      if (tile) {
        gjvt[name] = tile
      } else {
        gjvt[name] = {features: []}
      }

      let vectorTilePBF = vtpbf.fromGeojsonVt(gjvt)
      resolve(vectorTilePBF)
      console.timeEnd('x ' + x + ' y ' + y + ' z ' + z)
    })
  }

  emptyVectorTile (name) {
    var gjvt = {}
    gjvt[name] = {features: []}
    return vtpbf.fromGeojsonVt(gjvt)
  }

  getLayerColumns () {
    let columns = {
      columns: [],
      geom: {
        name: 'geometry'
      },
      id: {
        name: 'generated_id',
        dataType: 'INTEGER'
      }
    }
    this.layer.fields.forEach((field, i) => {
      let dataType = field.type
      if (dataType === 'string') dataType = 'TEXT'
      let c = {
        dataType: dataType,
        name: field.name,
        justification: field.justification,
        ignored: field.ignored,
        precision: field.precision,
        width: field.width
      }
      columns.columns.push(c)
      console.log('c', c)
    })
    return columns
  }

  iterateFeaturesInBounds (bounds, buffer) {
    let wgs84 = gdal.SpatialReference.fromEPSG(4326)
    let fromNative = new gdal.CoordinateTransformation(wgs84, this.layer.srs)
    let toNative = new gdal.CoordinateTransformation(this.layer.srs, wgs84)
    let envelope = new gdal.Envelope({
      minX: bounds[0][1],
      maxX: bounds[1][1],
      minY: bounds[0][0],
      maxY: bounds[1][0]
    })

    let bufferDistance = 0
    if (buffer) {
      bufferDistance = ((bounds[1][1] - bounds[0][1]) / 256) * 32
    }
    let filter = envelope.toPolygon().buffer(bufferDistance, 0).getEnvelope().toPolygon()
    if (!this.layer.srs.isSame(wgs84)) {
      filter.transform(fromNative)
    }
    this.layer.setSpatialFilter(filter)
    let featureMap = this.layer.features.map((feature) => {
      try {
        let projected = feature.clone()
        let geom = projected.getGeometry()
        if (!this.layer.srs.isSame(wgs84)) {
          geom.transform(toNative)
        }
        if (envelope.toPolygon().within(geom)) {
          return
        }
        geom.intersection(envelope.toPolygon().buffer(bufferDistance))
        let geojson = geom.toObject()

        return {
          type: 'Feature',
          properties: feature.fields.toObject(),
          geometry: geojson
        }
      } catch (e) {

      }
    })
    this.layer.setSpatialFilter(null)

    return featureMap
  }
}
