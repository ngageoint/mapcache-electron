import VectorLayer from './VectorLayer'
import request from 'request-promise-native'

export default class WFSLayer extends VectorLayer {
  _features

  async initialize () {
    this._features = await this.getFeaturesInLayer(this._configuration.sourceLayerName)
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: 'WFS'
      }
    }
  }

  get featureCollection () {
    return {
      type: 'FeatureCollection',
      features: this._features
    }
  }

  getFeaturesInLayer (layer) {
    return new Promise((resolve) => {
      let options = {
        method: 'GET',
        url: this.filePath + '&request=GetFeature&typeNames=' + layer + '&outputFormat=application/json&srsName=crs:84',
        encoding: null,
        gzip: true
      }
      if (this.credentials) {
        if (this.credentials.type === 'basic' || this.credentials.type === 'bearer') {
          if (!options.headers) {
            options.headers = {}
          }
          options.headers['Authorization'] = this.credentials.authorization
        }
      }
      request(options, (error, response, body) => {
        if (!error) {
          let featureCollection = JSON.parse(body)
          if (featureCollection && featureCollection.features) {
            let features = []
            featureCollection.features.forEach((feature) => {
              let splitType = ''
              if (feature.geometry.type === 'MultiPolygon') {
                splitType = 'Polygon'
              } else if (feature.geometry.type === 'MultiLineString') {
                splitType = 'LineString'
              } else {
                features.push(feature)
                return
              }
              feature.geometry.coordinates.forEach((coords) => {
                features.push({
                  type: 'Feature',
                  properties: feature.properties,
                  geometry: {
                    type: splitType,
                    coordinates: coords
                  }
                })
              })
            })
            resolve(features)
          } else {
            resolve([])
          }
        }
      })
    })
  }
}
