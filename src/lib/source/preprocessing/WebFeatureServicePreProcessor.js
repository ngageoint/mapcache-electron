import Preprocessor from './Preprocessor'
import axios from 'axios'
import {getLayerOutputFormat, getFeatureRequestURL} from '../../util/GeoServiceUtilities'
import {USER_CANCELLED_MESSAGE} from '../../network/HttpUtilities'

/**
 * Handles the preprocessing of a Web Feature Service. This retrieves the feature data from the service before sending to
 * the server to be turned into a geopackage feature table.
 */
export default class WebFeatureServicePreProcessor extends Preprocessor {
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
   * Will retrieve the layer's data
   * @param url
   * @param layer
   * @param outputFormat
   * @param srs
   * @param withCredentials
   * @returns {Promise<unknown>}
   */
  async getLayerData (url, layer, outputFormat, srs, withCredentials = false) {
    return new Promise((resolve) => {
      const cancelSource = axios.CancelToken.source()
      this.cancelSources.push(cancelSource)
      axios({
        url: getFeatureRequestURL(url, layer.name, outputFormat, srs, layer.version),
        withCredentials: withCredentials,
        cancelToken: cancelSource.token
      }).then(response => {
        const data = response.data
        resolve({data, id: layer.id})
      }).catch((e) => {
        resolve({error: e, id: layer.id})
      })
    })
  }

  /**
   * Gets the WFS layers' data
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
          let outputFormat = getLayerOutputFormat(layer)

          let srs = layer.defaultSRS
          const otherSrs = layer.otherSRS.find(s => s.endsWith(':4326'))
          if (otherSrs) {
            srs = otherSrs
          }
          this.getLayerData(url, layer, outputFormat, srs, withCredentials).then(result => {
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
