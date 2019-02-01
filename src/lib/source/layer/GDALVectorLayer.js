import Layer from './Layer'
import MapcacheMapLayer from '../../map/MapcacheMapLayer'
import gdal from 'gdal'
import path from 'path'
import jetpack from 'fs-jetpack'
import proj4 from 'proj4'
import geojsonvt from 'geojson-vt'
import * as vtpbf from 'vt-pbf'
import Pbf from 'pbf'
import * as VectorTile from '@mapbox/vector-tile'
import TileBoundingBoxUtils from '../../tile/tileBoundingBoxUtils'
import MapboxGL from '@mapbox/mapbox-gl-native'
import Sharp from 'sharp'
import Mercator from '@mapbox/sphericalmercator'

export default class GDALVectorLayer extends Layer {
  async initialize () {
    // let gdalFilePath = this.configuration.file.path
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

    MapboxGL.on('message', function (msg) {
      console.log({msg})
    })

    this._mapboxGlMap = new MapboxGL.Map({
      request: function (req, callback) {
        let split = req.url.split('-')
        let z = Number(split[0])
        let x = Number(split[1])
        let y = Number(split[2])
        console.log('go get the tile', req)

        getTile({x: x, y: y, z: z}, layer, extent, name)
          .then(function (buff) {
            callback(null, {data: buff})
          })
      },
      ratio: 1
    })

    let styleSources = {}
    styleSources[this.name] = {
      'type': 'vector',
      'maxzoom': 18,
      'tiles': [
        '{z}-{x}-{y}'
      ]
    }

    this._mapboxGlMap.load({
      'version': 8,
      'name': 'Empty',
      'sources': styleSources,
      'layers': [
        {
          'id': this.name + 'line',
          'type': 'line',
          'source': this.name,
          'source-layer': this.name,
          'paint': {
            'line-width': 1.0,
            'line-color': 'blue'
          }
        },
        {
          'id': this.name + 'circle',
          'type': 'circle',
          'source': this.name,
          'source-layer': this.name,
          'paint': {
            'circle-radius': {
              'stops': [
                [0, 5],
                [20, 10]
              ],
              'base': 2
            },
            'circle-color': '#5b94c6',
            'circle-opacity': 0.6
          }
        }
      ]
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
      fillOpacity: 1,
      fill: false
    }
    return this._style
  }

  async renderTile (coords, tileCanvas, done) {
    let map = this._mapboxGlMap
    let {x, y, z} = coords
    console.log('rendertile', coords)
    let width = tileCanvas ? tileCanvas.width : 256
    let height = tileCanvas ? tileCanvas.height : 256

    let merc = new Mercator()
    let longitude = ((x + 0.5) / (1 << z)) * (256 << z)
    let latitude = ((y + 0.5) / (1 << z)) * (256 << z)
    let tileCenter = merc.ll([
      longitude,
      latitude
    ], z)

    let renderWidth = z === 0 ? width * 2 : width
    let renderHeight = z === 0 ? height * 2 : height

    map.render({
      zoom: z,
      center: [tileCenter[0], tileCenter[1]],
      width: renderWidth,
      height: renderHeight
    }, async (err, buffer) => {
      if (err) throw err
      if (tileCanvas) {
        let image = await Sharp(buffer, {
          raw: {
            width: renderWidth,
            height: renderHeight,
            channels: 4
          }
        })

        if (z === 0) {
          image.resize(width, height)
        }
        const data = await image.raw()
          .toBuffer()
        tileCanvas.putImageData(new ImageData(data, width, height))
        if (done) {
          done(null, tileCanvas)
        }
        return tileCanvas
      } else {
        let image = Sharp(buffer, {
          raw: {
            width: renderWidth,
            height: renderHeight,
            channels: 4
          }
        })
        if (z === 0) {
          image.resize(width, height)
        }
        const pngdata = await image.png()
          .toBuffer()
        if (done) {
          done(null, pngdata)
        }
        return pngdata
      }
    })
  }

  get mapLayer () {
    if (this._mapLayer) return [this._mapLayer]

    this._mapLayer = new MapcacheMapLayer({
      layer: this,
      pane: this.pane
    })

    this._mapLayer.id = this.id
    return [this._mapLayer]
  }

  renderOverviewTile () {
    let map = this._mapboxGlMap
    return new Promise(function (resolve) {
      map.render({zoom: 0}, function (err, buffer) {
        if (err) throw err
        let image = Sharp(buffer, {
          raw: {
            width: 512,
            height: 512,
            channels: 4
          }
        })

        image.toFile('/tmp/image.png', function (err) {
          if (err) throw err
          resolve()
        })
      })
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

    if (!TileBoundingBoxUtils.tileIntersects(tileUpperRight, tileLowerLeft, [extent[2], extent[3]], [extent[0], extent[1]])) {
      return resolve()
    }

    console.time('x ' + x + ' y ' + y + ' z ' + z)
    let envelope = new gdal.Envelope({
      minX: tileLowerLeft[0],
      maxX: tileUpperRight[0],
      minY: tileLowerLeft[1],
      maxY: tileUpperRight[1]
    })
    let filter = envelope.toPolygon()
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
        let geom = projected.getGeometry()
        geom.transform(toNative)
        // I don't know why I have to do this, geom.toObject() should work just fine
        let wkt = geom.toWKT()
        let mygeom = gdal.Geometry.fromWKT(wkt)
        let geojson = mygeom.toObject()

        features.push({
          type: 'Feature',
          properties: feature.fields.toObject(),
          geometry: geojson
        })
      } catch (e) {
        console.log('error with feature', e)
      }
    }

    console.log('feature', featureCollection.features[0])

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
