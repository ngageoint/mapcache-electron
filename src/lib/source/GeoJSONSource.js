import Source from './Source'
import JSONStream from 'JSONStream'
import fs from 'fs'
// eslint-disable-next-line no-unused-vars
import * as Vendor from '../vendor'

export default class GeoJSONSource extends Source {
  async initialize () {
    let layers = this.layers = []
    let count = 0
    const initialJson = {
      type: 'FeatureCollection',
      features: []
    }
    let currentJson = Object.assign({}, initialJson)
    let saveSource = this.saveSource.bind(this)
    let configuration = this.configuration
    return new Promise(function (resolve) {
      const jsonStream = JSONStream.parse('features.*')
      jsonStream.on('data', function (data) {
        count++
        if (count % 5000 === 0) {
          console.log('count', count)
        }
        currentJson.features.push(data)
        if (count === 1000000) {
          count = 0
          layers.push(Vendor.L.vectorGrid.slicer(currentJson, {
          }))
          currentJson = Object.assign({}, initialJson)
        }
      })
      jsonStream.on('end', function () {
        layers.push(Vendor.L.vectorGrid.slicer(currentJson, {
          interactive: true
        }))
        console.log('configuration', configuration)
        saveSource(configuration)
        resolve()
      })
      fs.createReadStream(configuration.file.path)
        .pipe(jsonStream)
    })
  }

  get mapLayer () {
    if (this.layers) return this.layers
    return []
  }
}
