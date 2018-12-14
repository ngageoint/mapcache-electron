import Source from './Source'
import JSONStream from 'JSONStream'
import fs from 'fs'
// eslint-disable-next-line no-unused-vars
import * as Vendor from '../vendor'

export default class GeoJSONSource extends Source {
  async initialize () {
    let layers = this.layers = []
    let count = 0
    let totalCount = 0
    const initialJson = {
      type: 'FeatureCollection',
      features: []
    }
    let currentJson = Object.assign({}, initialJson)
    let configuration = this.configuration
    let currentEnvelope = {
      minX: -180,
      maxX: 180,
      minY: -85,
      maxY: 85
    }

    if (!this.configuration.layers) {
      let layerId = this.generateLayerId()
      let overviewTilePath = this.sourceCacheFolder.dir(layerId).path('overviewTile.png')
      this.configuration.layers = [{
        type: 'feature',
        id: layerId,
        name: this.configuration.name,
        overviewTile: overviewTilePath,
        extent: [currentEnvelope.minX, currentEnvelope.minY, currentEnvelope.maxX, currentEnvelope.maxY],
        style: {
          weight: 2,
          radius: 2,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
          opacity: 1,
          fillColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
          fillOpacity: 1,
          fill: false
        }
      }]
      this.saveSource(configuration)
    }
    let styles = {
      sliced: this.configuration.layers[0].style
    }
    return new Promise(function (resolve) {
      const jsonStream = JSONStream.parse('features.*')
      jsonStream.on('data', function (data) {
        totalCount++
        count++
        if (count % 5000 === 0) {
          console.log('count', count)
        }
        currentJson.features.push(data)
        if (count === 1000000) {
          count = 0
          layers.push(Vendor.L.vectorGrid.slicer(currentJson, {
            pane: 'overlayPane',
            maxNativeZoom: 18,
            vectorTileLayerStyles: styles,
            rendererFactory: Vendor.L.canvas.tile
          }))
          currentJson = Object.assign({}, initialJson)
        }
      })
      jsonStream.on('end', function () {
        layers.push(Vendor.L.vectorGrid.slicer(currentJson, {
          interactive: true,
          pane: 'overlayPane',
          maxNativeZoom: 18,
          vectorTileLayerStyles: styles,
          rendererFactory: Vendor.L.canvas.tile
        }))
        configuration.count = totalCount
        resolve()
      })
      fs.createReadStream(configuration.file.path)
        .pipe(jsonStream)
    })
  }

  get mapLayer () {
    if (this.layerGroup) return this.layerGroup
    this.layerGroup = Vendor.L.layerGroup(this.layers)
    this.layerGroup.id = this.configuration.layers[0].id
    return [this.layerGroup]
  }
}
