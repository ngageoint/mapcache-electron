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
    this.geopackageLayers = []
    for (const layer of this.layers) {
      const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
      let featureCollection = await this.getFeatureCollectionInLayer(layer.name)
      let fileName = layer.name + '.gpkg'
      let filePath = path.join(sourceDirectory, fileName)
      await GeoPackageUtilities.buildGeoPackage(filePath, layer.name, featureCollection)
      const extent = GeoPackageUtilities.getGeoPackageExtent(filePath, layer.name)
      this.geopackageLayers.push(new VectorLayer({
        id: sourceId,
        geopackageFilePath: filePath,
        sourceFilePath: this.filePath,
        sourceDirectory: sourceDirectory,
        sourceId: sourceId,
        sourceLayerName: layer.name,
        sourceType: 'WFS',
        extent: extent
      }))
    }
    return this.geopackageLayers
  }

  getFeatureCollectionInLayer (layer) {
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
          resolve(featureCollection)
        }
      })
    })
  }
}
