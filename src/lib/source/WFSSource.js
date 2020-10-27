import Source from './Source'
import {remote} from 'electron'
import request from 'request-promise-native'
import path from 'path'
import GeoPackageUtilities from '../GeoPackageUtilities'
import VectorLayer from './layer/vector/VectorLayer'
import _ from 'lodash'
import GeoServiceUtilities from '../GeoServiceUtilities'
import FileUtilities from '../FileUtilities'

export default class WFSSource extends Source {
  async retrieveLayers () {
    const geopackageLayers = []
    let featureCollection = {
      type: 'FeatureCollection',
      features: []
    }
    for (const layer of this.layers) {
      let features = await this.getFeaturesInLayer(layer.name)
      featureCollection.features = featureCollection.features.concat(features)
    }
    const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
    let fileName = this.sourceName + '.gpkg'
    let filePath = path.join(sourceDirectory, fileName)
    await GeoPackageUtilities.buildGeoPackage(filePath, this.sourceName, featureCollection)
    const extent = GeoPackageUtilities.getGeoPackageExtent(filePath, this.sourceName)
    geopackageLayers.push(new VectorLayer({
      id: sourceId,
      name: this.sourceName,
      geopackageFilePath: filePath,
      sourceFilePath: this.filePath,
      sourceDirectory: sourceDirectory,
      sourceId: sourceId,
      sourceLayerName: this.sourceName,
      sourceType: 'WFS',
      extent: extent
    }))
    return geopackageLayers
  }

  getFeaturesInLayer (layer) {
    return new Promise((resolve) => {
      let options = {
        method: 'GET',
        url: GeoServiceUtilities.getFeatureRequestURL(this.filePath, layer, 'application/json', 'crs:84'),
        encoding: null,
        gzip: true,
        headers: {
          'User-Agent': remote.getCurrentWebContents().session.getUserAgent()
        }
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
          if (_.isNil(featureCollection)) {
            featureCollection = {
              type: 'FeatureCollection',
              features: []
            }
          }
          resolve(featureCollection.features.filter(f => f !== undefined))
        }
      })
    })
  }
}
