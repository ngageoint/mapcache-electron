import Source from './Source'
import {remote} from 'electron'
import superagent from 'superagent'
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
      let request = superagent.get(GeoServiceUtilities.getFeatureRequestURL(this.filePath, layer, 'application/json', 'crs:84', layer.version))
      request.set('User-Agent', remote.getCurrentWebContents().session.getUserAgent())
      if (this.credentials && (this.credentials.type === 'basic' || this.credentials.type === 'bearer')) {
        request.set('Authorization', this.credentials.authorization)
      }
      request.accept('json').then(res => {
        let featureCollection = res.body
        if (_.isNil(featureCollection)) {
          featureCollection = {
            type: 'FeatureCollection',
            features: []
          }
        }
        resolve(featureCollection.features.filter(f => f !== undefined))
      }).catch(err => {
        console.error(err)
      })
    })
  }
}
