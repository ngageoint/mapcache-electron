import Preprocessor from './Preprocessor'
import axios from 'axios'
import {USER_CANCELLED_MESSAGE} from '../../network/HttpUtilities'
import {getBaseUrlAndQueryParams} from '../../util/URLUtilities'
import isNil from 'lodash/isNil'

/**
 * Handles the preprocessing of a Web Feature Service. This retrieves the feature data from the service before sending to
 * the server to be turned into a geopackage feature table.
 */
export default class ArcGISFeatureServicePreprocessor extends Preprocessor {
  cancelled = false
  cancelSources = []

  /**
   * Constructor
   * @param source (will be cloned)
   */
  constructor (source) {
    super(source)
  }

  /**
   * Returns an esri json layer
   * @param arcgisUrl
   * @param layer
   * @param withCredentials
   * @returns {Promise<any>}
   */
  async getLayerData (arcgisUrl, layer, withCredentials = false) {
    return new Promise( (resolve) => {
      const cancelSource = axios.CancelToken.source()
      this.cancelSources.push(cancelSource)

      const { baseUrl, queryParams } = getBaseUrlAndQueryParams(arcgisUrl)
      let url = baseUrl + '/' + layer.id + '/query/?f=json&' +
        'returnGeometry=true&spatialRel=esriSpatialRelIntersects&geometry=' +
        encodeURIComponent(
          '{"xmin":' +
          -180.0 +
          ',"ymin":' +
          -90.0 +
          ',"xmax":' +
          180.0 +
          ',"ymax":' +
          90.0 +
          ',"spatialReference":{"wkid":4326}}'
        ) +
        '&geometryType=esriGeometryEnvelope&inSR=4326&outFields=*' +
        '&outSR=4326'
      if (!isNil(queryParams['token'])) {
        url = url + '&token=' + queryParams['token']
      }
      axios({
        url: url,
        withCredentials: withCredentials,
        cancelToken: cancelSource.token
      }).then(response => {
        resolve({ data: response.data, id: layer.id })
      }).catch(err => {
        // eslint-disable-next-line no-console
        resolve({ error: err, id: layer.id })
      })
    })
  }

  /**
   * Gets the ArcGIS FS layers' data
   * @param url
   * @param layers
   * @param withCredentials
   * @returns {Promise<unknown>}
   */
  async getLayerFeatures (url, layers, withCredentials = false) {
    const promises = []
    let layerDatum = {}
    for (const layer of layers) {
      if (!this.cancelled) {
        promises.push(new Promise(resolve => {
          this.getLayerData(url, layer, withCredentials).then(result => {
            resolve(result)
          })
        }))
      }
    }
    const results = await Promise.allSettled(promises)
    for (let i = 0; i < results.length; i++) {
      const layerData = results[i].value
      if (layerData.error) {
        throw layerData.error
      }
      layerDatum[layerData.id] = layerData.data
    }
    return layerDatum
  }

  /**
   * Begins execution and returns an updated source configuration
   * @returns {*}
   */
  async preprocess () {
    this.source.layerDatum = await this.getLayerFeatures(this.source.url, this.source.layers, this.source.withCredentials)
    return this.source
  }

  /**
   * Cancels the preprocessing
   */
  cancel () {
    this.cancelled = true
    this.cancelSources.forEach(cancelSource => {
      cancelSource.cancel(USER_CANCELLED_MESSAGE)
    })
  }
}
