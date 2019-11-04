import Source from './Source'
import {remote} from 'electron'
import request from 'request-promise-native'
import path from 'path'
import GeoPackageUtilities from '../GeoPackageUtilities'
import VectorLayer from './layer/vector/VectorLayer'
import _ from 'lodash'

export default class WFSSource extends Source {
  async retrieveLayers () {
    this.geopackageLayers = []
    for (const layer of this.layers) {
      let featureCollection = await this.getFeatureCollectionInLayer(layer.name)
      let fileName = layer.name + '.gpkg'
      let filePath = this.sourceCacheFolder.file(fileName).path()
      let fullFile = path.join(filePath, fileName)
      let gp = await GeoPackageUtilities.buildGeoPackage(fullFile, layer.name, featureCollection)
      this.geopackageLayers.push(new VectorLayer({
        id: this.sourceId,
        geopackageFilePath: fullFile,
        sourceFilePath: this.filePath,
        sourceLayerName: layer.name,
        sourceType: 'WFS',
        tablePointIconRowId: GeoPackageUtilities.getTableIconId(gp, name, 'Point')
      }))
    }
    return this.geopackageLayers
  }

  getFeatureCollectionInLayer (layer) {
    return new Promise((resolve) => {
      let options = {
        method: 'GET',
        url: this.filePath + '&request=GetFeature&typeNames=' + layer + '&outputFormat=application/json&srsName=crs:84',
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
          resolve(featureCollection)
        }
      })
    })
  }
}
