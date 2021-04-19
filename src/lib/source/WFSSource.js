import Source from './Source'
import axios from 'axios'
import path from 'path'
import VectorLayer from './layer/vector/VectorLayer'
import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'
import GeoServiceUtilities from '../util/GeoServiceUtilities'
import GML2 from 'ol/format/GML2'
import GML3 from 'ol/format/GML3'
import GML32 from 'ol/format/GML32'
import GeoJSON from 'ol/format/GeoJSON'
import WFS from 'ol/format/WFS'
import OpenLayersProjectionUtilities from '../projection/OpenLayersProjectionUtilities'
import GeoPackageFeatureTableUtilities from '../geopackage/GeoPackageFeatureTableUtilities'
import GeoPackageCommon from '../geopackage/GeoPackageCommon'

export default class WFSSource extends Source {
  constructor (id, directory, filePath, layers = [], sourceName) {
    super(id, directory, filePath)
    this.layers = layers
    this.sourceName = sourceName
  }

  /**
   * Will attempt to make a GetFeature request.
   * Supports WFS 1.0.0, 1.1.0 and 2.0.0
   * Supports GeoJSON, GML2, and GML3 and GML32
   * @param layer
   * @returns {Promise<any>}
   */
  getFeaturesInLayer (layer) {
    return new Promise((resolve, reject) => {
      let outputFormat = GeoServiceUtilities.getLayerOutputFormat(layer)

      let srs = layer.defaultSRS
      const otherSrs = layer.otherSRS.find(s => s.endsWith(':4326'))
      if (otherSrs) {
        srs = otherSrs
      }

      OpenLayersProjectionUtilities.addTransformation(srs, 'EPSG:4326')

      axios({
        url: GeoServiceUtilities.getFeatureRequestURL(this.filePath, layer.name, outputFormat, srs, layer.version),
        withCredentials: true
      }).then(response => {
        // setup options for parsing response
        const options = {
          featureProjection: 'EPSG:4326'
        }
        if (!srs.endsWith(':4326')) {
          options.dataProjection = srs
        }

        let featureCollection
        let features = {}
        if (outputFormat === 'application/json') {
          features = new GeoJSON().readFeatures(response.data, options)
        } else if (outputFormat === 'GML32') {
          features = new WFS({gmlFormat: new GML32(), version: layer.version}).readFeatures(response.data, options)
        } else if (outputFormat === 'GML3') {
          features = new WFS({gmlFormat: new GML3(), version: layer.version}).readFeatures(response.data, options)
        } else if (outputFormat === 'GML2') {
          features = new WFS({gmlFormat: new GML2(), version: layer.version}).readFeatures(response.data, options)
        } else {
          reject(new Error('Service in unsupported WFS format: ' + outputFormat))
        }
        featureCollection = new GeoJSON().writeFeaturesObject(features)
        if (isNil(featureCollection) || isNil(featureCollection.features) || isEmpty(featureCollection.features)) {
          throw new Error('Error retrieving features.')
        }
        resolve(featureCollection.features.filter(f => f !== undefined))
      }).catch(() => {
        reject('Error retrieving WFS features.')
      })
    })
  }

  async retrieveLayers () {
    let featureCollection = {
      type: 'FeatureCollection',
      features: []
    }
    for (const layer of this.layers) {
      let features = await this.getFeaturesInLayer(layer).catch(err => {
        throw err
      })
      featureCollection.features = featureCollection.features.concat(features)
    }
    const { layerId, layerDirectory } = this.createLayerDirectory()
    let fileName = this.sourceName + '.gpkg'
    let filePath = path.join(layerDirectory, fileName)
    await GeoPackageFeatureTableUtilities.buildGeoPackage(filePath, this.sourceName, featureCollection).catch(err => {
      throw err
    })
    const extent = await GeoPackageCommon.getGeoPackageExtent(filePath, this.sourceName)
    return [
      new VectorLayer({
        id: layerId,
        directory: layerDirectory,
        sourceDirectory: this.directory,
        name: this.sourceName,
        geopackageFilePath: filePath,
        sourceFilePath: this.filePath,
        sourceLayerName: this.sourceName,
        sourceType: 'WFS',
        count: featureCollection.features.length,
        extent: extent
      })
    ]
  }
}
