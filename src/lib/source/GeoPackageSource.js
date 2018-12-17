import jetpack from 'fs-jetpack'
import Source from './Source'
// eslint-disable-next-line no-unused-vars
import GeoPackage from '@ngageoint/geopackage'
// eslint-disable-next-line no-unused-vars
import * as Vendor from '../vendor'
// eslint-disable-next-line no-unused-vars
import LeafletGeoPackage from '@ngageoint/leaflet-geopackage'
import * as TileBoundingBoxUtils from '../tile/tileBoundingBoxUtils'

export default class GeoPackageSource extends Source {
  async initialize () {
    let geopackagePath = this.configuration.file.path
    this.geopackage = await GeoPackage.open(geopackagePath)
    return this.createAndSaveConfigurationInformation()
  }

  async createAndSaveConfigurationInformation () {
    if (!this.configuration.layers) {
      let sourceLayers = this.configuration.layers = []
      let tileLayers = this.geopackage.getTileTables()
      let geopackage = this.geopackage
      for (const layer of tileLayers) {
        let contentsDao = geopackage.getContentsDao()
        let contents = contentsDao.queryForId(layer)
        let tileDao = geopackage.getTileDao(layer)
        let proj = contentsDao.getProjection(contents)
        let ll = proj.inverse([contents.min_x, contents.min_y])
        let ur = proj.inverse([contents.max_x, contents.max_y])
        let {width, height} = TileBoundingBoxUtils.determineImageDimensionsFromExtent(ll, ur)
        let retriever = new GeoPackage.GeoPackageTileRetriever(tileDao, width, height)
        let targetBoundingBox = new GeoPackage.BoundingBox(ll[0], ur[0], ll[1], ur[1])
        let canvas = Vendor.L.DomUtil.create('canvas')
        canvas.width = width
        canvas.height = height
        console.log('height', height)
        console.log('width', width)
        await retriever.getTileWithWgs84BoundsInProjection(targetBoundingBox, tileDao.minZoom, 'EPSG:4326', canvas)
        let layerId = this.generateLayerId()
        let overviewTilePath = this.sourceCacheFolder.dir(layerId).path('overviewTile.png')
        canvas.toBlob(function (blob) {
          var reader = new FileReader()
          reader.addEventListener('loadend', function () {
            // reader.result contains the contents of blob as a typed array
            jetpack.write(overviewTilePath, Buffer.from(reader.result))
          })
          reader.readAsArrayBuffer(blob)
        }, 'image/png')
        sourceLayers.push({
          id: layerId,
          name: layer,
          type: 'tile',
          count: tileDao.count(),
          extent: [ll[0], ll[1], ur[0], ur[1]],
          overviewTile: overviewTilePath,
          style: {
            opacity: 1
          }
        })
      }
      let featureLayers = this.geopackage.getFeatureTables()
      for (const layer of featureLayers) {
        let contentsDao = geopackage.getContentsDao()
        let contents = contentsDao.queryForId(layer)
        let featureDao = geopackage.getFeatureDao(layer)
        let proj = contentsDao.getProjection(contents)
        let ll = proj.inverse([contents.min_x, contents.min_y])
        let ur = proj.inverse([contents.max_x, contents.max_y])
        let layerId = this.generateLayerId()
        let sourceCacheFolder = this.sourceCacheFolder
        let overviewTilePath = sourceCacheFolder.dir(layerId).path('overviewTile.png')
        sourceLayers.push({
          id: layerId,
          name: layer,
          type: 'feature',
          extent: [ll[0], ll[1], ur[0], ur[1]],
          count: featureDao.count(),
          overviewTile: overviewTilePath,
          style: {
            weight: 1,
            radius: 2,
            color: '#' + Math.floor(Math.random() * 16777215).toString(16),
            opacity: 1,
            fillColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
            fillOpacity: 1,
            fill: false
          }
        })
      }
    }
    this.saveSource(this.configuration)
  }

  get mapLayer () {
    if (this.layers) return this.layers
    let layers = this.layers = []
    let geopackage = this.geopackage
    for (let layer of this.configuration.layers) {
      if (layer.type === 'tile') {
        let leafletLayer = new Vendor.L.GeoPackageTileLayer({
          geoPackage: geopackage,
          layerName: layer.name,
          pane: 'tilePane'
        })
        leafletLayer.id = layer.id
        layers.push(leafletLayer)
      } else if (layer.type === 'feature') {
        var styles = {}
        styles[layer.name] = layer.style
        let vectorLayer = Vendor.L.vectorGrid.protobuf('', {
          maxNativeZoom: 18,
          vectorTileLayerStyles: styles,
          interactive: true,
          pane: 'overlayPane',
          rendererFactory: Vendor.L.canvas.tile,
          getFeatureId: function (feature) {
            feature.properties.id = layer + feature.id
            return feature.properties.id
          }
        })
        vectorLayer.id = layer.id

        vectorLayer._getVectorTilePromise = function (coords, tileBounds) {
          return getTile(coords, tileBounds, layer.name, geopackage)
        }

        let sourceCacheFolder = this.sourceCacheFolder
        let overviewTilePath = sourceCacheFolder.dir(layer.id).path('overviewTile.png')

        if (!jetpack.exists(overviewTilePath)) {
          vectorLayer.on('add', function () {
            let {x, y, z} = TileBoundingBoxUtils.determineXYZTileInsideExtent([layer.extent[0], layer.extent[1]], [layer.extent[2], layer.extent[3]])
            console.log('add', x, y, z)
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
                var reader = new FileReader()
                reader.addEventListener('loadend', function () {
                  // reader.result contains the contents of blob as a typed array
                  let overviewTilePath = sourceCacheFolder.dir(layer.id).path('overviewTile.png')
                  jetpack.write(overviewTilePath, Buffer.from(reader.result))
                })
                reader.readAsArrayBuffer(blob)
              }, 'image/png')
            })
          })
        }

        layers.push(vectorLayer)
      }
    }
    return layers
  }
}

function getTile (coords, tileBounds, table, geoPackage) {
  var x = coords.x
  var y = coords.y
  var z = coords.z
  return GeoPackage.getVectorTile(geoPackage, table, x, y, z)
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
