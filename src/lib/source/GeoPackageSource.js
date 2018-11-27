import Source from './Source'
// eslint-disable-next-line no-unused-vars
import GeoPackage from '@ngageoint/geopackage'
// import fs from 'fs'
// eslint-disable-next-line no-unused-vars
import * as Vendor from '../vendor'
// eslint-disable-next-line no-unused-vars
import LeafletGeoPackage from '@ngageoint/leaflet-geopackage'

export default class GeoPackageSource extends Source {
  async initialize () {
    let geopackagePath = this.configuration.file.path
    this.geopackage = await GeoPackage.open(geopackagePath)
    this.saveSource(this.configuration)
  }

  get mapLayer () {
    if (this.layers) return this.layers
    let layers = this.layers = []
    let geopackage = this.geopackage
    let tileLayers = this.geopackage.getTileTables()
    let featureLayers = this.geopackage.getFeatureTables()
    console.log({tileLayers})
    console.log({featureLayers})
    tileLayers.forEach(function (layer) {
      let leafletLayer = new Vendor.L.GeoPackageTileLayer({
        geoPackage: geopackage,
        layerName: layer,
        pane: 'tilePane'
      })
      layers.push(leafletLayer)
    })
    featureLayers.forEach(function (layer) {
      var styles = {}
      styles[layer] = {
        weight: 2,
        radius: 3
      }
      var vectorLayer = Vendor.L.vectorGrid.protobuf('', {
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

      vectorLayer._getVectorTilePromise = function (coords, tileBounds) {
        return getTile(coords, tileBounds, layer, geopackage)
      }

      layers.push(vectorLayer)
    })
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
