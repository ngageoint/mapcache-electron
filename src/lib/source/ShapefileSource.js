import Source from './Source'
import proj4 from 'proj4'
import gdal from 'gdal'
import * as TileBoundingBoxUtils from '../tile/tileBoundingBoxUtils'
import * as geojsonvt from 'geojson-vt'
import * as vtpbf from 'vt-pbf'
import * as Pbf from 'pbf'
import * as VectorTile from '@mapbox/vector-tile'
// eslint-disable-next-line no-unused-vars
import * as Vendor from '../vendor'

export default class ShapefileSource extends Source {
  async initialize () {
    let shapefilePath = this.configuration.file.path
    let dataset = gdal.open(shapefilePath)
    this.shapelayers = dataset.layers
    let wgs84 = gdal.SpatialReference.fromEPSG(4326)

    let toNative = new gdal.CoordinateTransformation(this.shapelayers.get(0).srs, wgs84)
    let extentPoly = this.shapelayers.get(0).getExtent().toPolygon()
    extentPoly.transform(toNative)
    let currentEnvelope = extentPoly.getEnvelope()

    this.shapelayers.forEach(function (layer) {
      console.log({layer})
      toNative = new gdal.CoordinateTransformation(layer.srs, wgs84)
      let extentPoly = layer.getExtent().toPolygon()
      extentPoly.transform(toNative)
      currentEnvelope = extentPoly.getEnvelope()
    })

    this.configuration.extent = [currentEnvelope.minX, currentEnvelope.minY, currentEnvelope.maxX, currentEnvelope.maxY]
    this.saveSource(this.configuration)
  }

  get mapLayer () {
    if (this.layers) return this.layers
    let layers = this.layers = []
    this.shapelayers.forEach(function (layer) {
      var styles = {}
      styles[layer.name] = {
        weight: 2,
        radius: 3,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16)
      }
      var vectorLayer = Vendor.L.vectorGrid.protobuf('', {
        maxNativeZoom: 18,
        vectorTileLayerStyles: styles,
        interactive: true,
        pane: 'overlayPane',
        rendererFactory: Vendor.L.canvas.tile,
        getFeatureId: function (feature) {
          return layer.name + feature.properties.id
        }
      })
        .bindPopup(function (feature) {
          var string = ''
          for (var key in feature.properties) {
            string += '<div class="item"><span class="label">' + key + ': </span>'
            string += '<span class="value">' + feature.properties[key] + '</span></div>'
          }
          return string
        })

      vectorLayer._getVectorTilePromise = function (coords, tileBounds) {
        return getTile(coords, tileBounds, layer)
          .then(function (json) {
            // Normalize feature getters into actual instanced features
            for (var layerName in json.layers) {
              var feats = []

              for (var i = 0; i < json.layers[layerName].length; i++) {
                var feat = json.layers[layerName].feature(i)
                feat.geometry = feat.loadGeometry()
                feats.push(feat)
              }

              json.layers[layerName].features = feats
            }

            return json
          })
      }

      layers.push(vectorLayer)
    })
    return layers
  }
}

function getTile (coords, tileBounds, shapeLayer) {
  return new Promise(function (resolve, reject) {
    let {x, y, z} = coords

    let wgs84 = gdal.SpatialReference.fromEPSG(4326)
    let toNative = new gdal.CoordinateTransformation(shapeLayer.srs, wgs84)
    let fromNative = new gdal.CoordinateTransformation(wgs84, shapeLayer.srs)

    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(coords.x, coords.y, coords.z)
    let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
    let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])

    console.log('Tile Intersects - start rendering')
    console.time('x ' + x + ' y ' + y + ' z ' + z)
    let envelope = new gdal.Envelope({
      minX: tileLowerLeft[0],
      maxX: tileUpperRight[0],
      minY: tileLowerLeft[1],
      maxY: tileUpperRight[1]
    })
    let filter = envelope.toPolygon()
    filter.transform(fromNative)
    shapeLayer.setSpatialFilter(filter)
    console.log('Feature count', shapeLayer.features.count())
    let features = []
    let featureCollection = {
      type: 'FeatureCollection',
      features: features
    }
    let featureMap = shapeLayer.features.map(function (feature) {
      return feature
    })
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

    let tileBuffer = 8
    let tileIndex = geojsonvt(featureCollection, {buffer: tileBuffer * 8, maxZoom: z})
    var tile = tileIndex.getTile(z, x, y)

    shapeLayer.setSpatialFilter(null)

    var gjvt = {}
    if (tile) {
      gjvt[shapeLayer.name] = tile
    } else {
      gjvt[shapeLayer.name] = {features: []}
    }

    let vectorTilePBF = vtpbf.fromGeojsonVt(gjvt)

    resolve(new VectorTile.VectorTile(new Pbf(vectorTilePBF)))
    console.timeEnd('x ' + x + ' y ' + y + ' z ' + z)
  })
}
