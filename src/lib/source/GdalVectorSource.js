/* eslint-disable */
import Source from './Source'
import proj4 from 'proj4'
import gdal from 'gdal'
import jetpack from 'fs-jetpack'
import * as TileBoundingBoxUtils from '../tile/tileBoundingBoxUtils'
import * as geojsonvt from 'geojson-vt'
import * as vtpbf from 'vt-pbf'
import * as Pbf from 'pbf'
import * as VectorTile from '@mapbox/vector-tile'
// eslint-disable-next-line no-unused-vars
import * as Vendor from '../vendor'

export default class GdalVectorSource extends Source {
  async initialize () {
    let gdalFilePath = this.configuration.file.path
    this.openGdalFile(gdalFilePath)
    this.createAndSaveConfigurationInformation()
    return this
  }

  openGdalFile (gdalFilePath) {
    gdal.config.set('OGR_ENABLE_PARTIAL_REPROJECTION', 'YES')
    this.dataset = gdal.open(gdalFilePath)
    this.gdalLayers = this.dataset.layers
  }

  removeMultiFeatures (layer) {
    let expanded = false
    let filePath = this.sourceCacheFolder.dir(layer.id).file(layer.name + '.shp').path()
    let outds = gdal.open(filePath, 'w', 'ESRI Shapefile')
    let outLayer = outds.layers.create(layer.name, layer.srs, gdal.wkbPolygon)
    layer.features.forEach(function (feature) {
      let geom = feature.getGeometry()
      if (geom.name === 'MULTIPOLYGON' || geom.name === 'MULTILINESTRING') {
        let children = geom.children
        children.forEach(function (child, i) {
          console.log('Processing', i)
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
      this.openGdalFile(filePath)
      layer = this.gdalLayers.get(0)
    } else {
      this.sourceCacheFolder.dir(layer.id).file(layer.name + '.shp').remove()
      filePath = undefined
    }
    return {
      layer: this.gdalLayers.get(0),
      filePath
    }
  }

  createAndSaveConfigurationInformation () {
    if (!this.configuration.layers) {
      let sourceId = this.generateSourceId()
      let wgs84 = gdal.SpatialReference.fromEPSG(4326)
      let sourceLayers = this.configuration.layers = []

      this.gdalLayers.forEach(function (layer) {
        let toNative = new gdal.CoordinateTransformation(layer.srs, wgs84)
        let extentPoly = layer.getExtent().toPolygon()
        extentPoly.transform(toNative)
        let currentEnvelope = extentPoly.getEnvelope()
        layer.id = this.generateLayerId()

        let removed = this.removeMultiFeatures(layer)
        layer = removed.layer
        this.configuration.file.path = removed.filePath || this.configuration.file.path

        let layerId = this.generateLayerId()
        let overviewTilePath = this.sourceCacheFolder.dir(layerId).path('overviewTile.png')

        sourceLayers.push({
          id: layerId,
          type: 'feature',
          name: layer.name,
          count: layer.features.count(),
          extent: [currentEnvelope.minX, currentEnvelope.minY, currentEnvelope.maxX, currentEnvelope.maxY],
          overviewTile: overviewTilePath,
          style: {
            weight: 2,
            radius: 2,
            color: '#' + Math.floor(Math.random() * 16777215).toString(16),
            opacity: 1,
            fillColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
            fillOpacity: 1,
            fill: false
          }
        })
      }.bind(this))
    }
    this.saveSource(this.configuration)
  }

  get mapLayer () {
    if (this.layers) return this.layers
    let layers = this.layers = []
    let configuration = this.configuration
    this.gdalLayers.forEach(function (layer) {
      var styles = {}
      let layerConfig = configuration.layers.find(function (sourceLayer) {
        return layer.name === sourceLayer.name
      })
      console.log('layer is', layer)
      console.log({layerConfig})
      styles[layer.name] = layerConfig.style
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
        return getTile(coords, tileBounds, layer, vectorLayer, configuration)
          .then(function (json) {
            if (!json) {
              return {}
            }
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

      let sourceCacheFolder = this.sourceCacheFolder
      let overviewTilePath = sourceCacheFolder.dir(layerConfig.id).path('overviewTile.png')
      if (!jetpack.exists(overviewTilePath)) {
        vectorLayer.on('add', function () {
          let {x, y, z} = TileBoundingBoxUtils.determineXYZTileInsideExtent([layerConfig.extent[0], layerConfig.extent[1]], [layerConfig.extent[2], layerConfig.extent[3]])
          let point = new Vendor.L.Point(x, y)
          point.z = z
          let canvas = vectorLayer.createTile(point, function () {
            let backgroundCanvas = Vendor.L.DomUtil.create('canvas')
            backgroundCanvas.width = 256
            backgroundCanvas.height = 256
            let ctx = backgroundCanvas.getContext('2d')
            ctx.rect(0, 0, 256, 256)
            ctx.fillStyle = 'white'
            ctx.fill()
            ctx.drawImage(canvas, 0, 0)
            backgroundCanvas.toBlob(function (blob) {
              console.log({blob})
              var reader = new FileReader()
              reader.addEventListener('loadend', function () {
                // reader.result contains the contents of blob as a typed array
                let overviewTilePath = sourceCacheFolder.dir(layerConfig.id).path('overviewTile.png')
                jetpack.write(overviewTilePath, Buffer.from(reader.result))
              })
              reader.readAsArrayBuffer(blob)
            }, 'image/png')
          })
        })
      }
      vectorLayer.id = layerConfig.id
      layers.push(vectorLayer)
    }.bind(this))
    return layers
  }
}

function getTile (coords, tileBounds, gdalLayer, sourceLayer, configuration) {
  return new Promise(function (resolve, reject) {
    let {x, y, z} = coords

    let wgs84 = gdal.SpatialReference.fromEPSG(4326)
    let toNative = new gdal.CoordinateTransformation(gdalLayer.srs, wgs84)
    let fromNative = new gdal.CoordinateTransformation(wgs84, gdalLayer.srs)

    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
    let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
    let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])

    let layerConfig = configuration.layers.find(function (layer) {
      return layer.id === sourceLayer.id
    })
    var fullExtent = layerConfig.extent
    if (!TileBoundingBoxUtils.tileIntersects(tileUpperRight, tileLowerLeft, [fullExtent[2], fullExtent[3]], [fullExtent[0], fullExtent[1]])) {
      return resolve()
    }

    // console.log('Tile Intersects - start rendering')
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

    gdalLayer.setSpatialFilter(null)

    var gjvt = {}
    if (tile) {
      gjvt[gdalLayer.name] = tile
    } else {
      gjvt[gdalLayer.name] = {features: []}
    }

    let vectorTilePBF = vtpbf.fromGeojsonVt(gjvt)

    resolve(new VectorTile.VectorTile(new Pbf(vectorTilePBF)))
    console.timeEnd('x ' + x + ' y ' + y + ' z ' + z)
  })
}
