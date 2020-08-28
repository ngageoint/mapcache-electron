import Source from './Source'
import {remote} from 'electron'
import request from 'request-promise-native'
import path from 'path'
import GeoPackageUtilities from '../GeoPackageUtilities'
import VectorLayer from './layer/vector/VectorLayer'
import _ from 'lodash'
import GeoServiceUtilities from '../GeoServiceUtilities'
import {userDataDir} from '../settings/Settings'
import UniqueIDUtilities from '../UniqueIDUtilities'
import { GeometryType } from '@ngageoint/geopackage'

export default class WFSSource extends Source {
  async retrieveLayers () {
    this.geopackageLayers = []
    for (const layer of this.layers) {
      let sourceId = UniqueIDUtilities.createUniqueID()
      let featureCollection = await this.getFeatureCollectionInLayer(layer.name)
      let fileName = layer.name + '.gpkg'
      let filePath = userDataDir().dir(sourceId).file(fileName).path()
      let fullFile = path.join(filePath, fileName)
      await GeoPackageUtilities.buildGeoPackage(fullFile, layer.name, featureCollection)
      this.geopackageLayers.push(new VectorLayer({
        id: sourceId,
        geopackageFilePath: fullFile,
        sourceFilePath: this.filePath,
        sourceLayerName: layer.name,
        sourceType: 'WFS',
        tablePointIconRowId: await GeoPackageUtilities.getTableIconId(fullFile, layer.name, GeometryType.nameFromType(GeometryType.POINT))
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
