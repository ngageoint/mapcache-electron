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

    let styleSources = {}
    styleSources[this.name] = {
      'type': 'vector',
      'maxzoom': 18,
      'tiles': [
        '{z}-{x}-{y}'
      ]
    }

    let mbStyle = {
      'version': 8,
      'name': 'Empty',
      'sources': styleSources,
      'layers': [
        {
          'id': 'fill-style',
          'type': 'fill',
          'source': this.name,
          'source-layer': this.name,
          'filter': ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
          'paint': {
            'fill-color': this.style.fillColor,
            'fill-opacity': this.style.fillOpacity
          }
        },
        {
          'id': 'line-style',
          'type': 'line',
          'source': this.name,
          'source-layer': this.name,
          'filter': ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          'paint': {
            'line-width': this.style.weight,
            'line-color': this.style.color
          }
        },
        {
          'id': 'point-style',
          'type': 'circle',
          'source': this.name,
          'source-layer': this.name,
          'filter': ['match', ['geometry-type'], ['Point'], true, false],
          'paint': {
            'circle-color': this.style.fillColor,
            'circle-stroke-color': this.style.color,
            'circle-opacity': this.style.fillOpacity,
            'circle-stroke-width': this.style.weight,
            'circle-radius': this.style.weight
          }
        }
      ]
    }

    this._vectorTileRenderer = new VectorTileRenderer(mbStyle, (x, y, z) => {
      return getTile({x: x, y: y, z: z}, layer, extent, name)
    })

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
      count: this.layer.features.count()
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

  get style () {
    this._style = this._style || {
      weight: 2,
      radius: 2,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      opacity: 1,
      fillColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
      fillOpacity: 0.5,
      fill: false
    }
    return this._style
  }

  async renderTile (coords, tileCanvas, done) {
    this._vectorTileRenderer.renderVectorTile(coords, tileCanvas, done)
  }

  get mapLayer () {
    if (this._mapLayer) return [this._mapLayer]

    this._mapLayer = new MapcacheMapLayer({
      layer: this,
      pane: 'overlayPane'
    })

    this._mapLayer.id = this.id
    return [this._mapLayer]
  }

  renderOverviewTile () {
    let overviewTilePath = this.overviewTilePath
    console.log('jetpack.exists(this.overviewTilePath)', jetpack.exists(this.overviewTilePath))
    if (jetpack.exists(this.overviewTilePath)) return
    console.log(this.overviewTilePath + ' does not exist')
    this.renderTile({x: 0, y: 0, z: 0}, null, function (err, imageData) {
      if (err) throw err
      jetpack.write(overviewTilePath, imageData)
    })
  }
}

function getTile (coords, gdalLayer, extent, name) {
  return new Promise(function (resolve, reject) {
    let {x, y, z} = coords

    let wgs84 = gdal.SpatialReference.fromEPSG(4326)
    let toNative = new gdal.CoordinateTransformation(gdalLayer.srs, wgs84)
    let fromNative = new gdal.CoordinateTransformation(wgs84, gdalLayer.srs)

    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
    let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
    let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])
    let distance = tileBbox.maxLat - tileBbox.minLat

    if (!TileBoundingBoxUtils.tileIntersects(tileUpperRight, tileLowerLeft, [extent[2], extent[3]], [extent[0], extent[1]])) {
      return resolve(emptyVectorTile(name))
    }

    console.time('x ' + x + ' y ' + y + ' z ' + z)
    let envelope = new gdal.Envelope({
      minX: tileLowerLeft[0],
      maxX: tileUpperRight[0],
      minY: tileLowerLeft[1],
      maxY: tileUpperRight[1]
    })
    let filter = envelope.toPolygon().buffer((distance / 256) * 8)
    filter.transform(fromNative)
    gdalLayer.setSpatialFilter(filter)
    let features = []
    let featureCollection = {
      type: 'FeatureCollection',
      features: features
    }
    let featureMap = gdalLayer.features.map(function (feature) {
      return feature
    })
    console.log('featureMap.length', featureMap.length)
    for (let i = 0; i < featureMap.length; i++) {
      let feature = featureMap[i]
      try {
        let projected = feature.clone()
        if (envelope.toPolygon().within(projected.getGeometry())) {
          continue
        }
        // let geom = projected.getGeometry()
        let geom = projected.getGeometry()
        geom.transform(toNative)
        geom.intersection(envelope.toPolygon().buffer((distance / 256) * 8))
        let geojson = geom.toObject()

        features.push({
          type: 'Feature',
          properties: feature.fields.toObject(),
          geometry: geojson
        })
      } catch (e) {
        console.log('error with feature', e)
      }
    }

    let tileBuffer = 8
    let tileIndex = geojsonvt(featureCollection, {buffer: tileBuffer * 8, maxZoom: z})
    var tile = tileIndex.getTile(z, x, y)
    gdalLayer.setSpatialFilter(null)

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

function emptyVectorTile (name) {
  var gjvt = {}
  gjvt[name] = {features: []}
  return vtpbf.fromGeojsonVt(gjvt)
}
