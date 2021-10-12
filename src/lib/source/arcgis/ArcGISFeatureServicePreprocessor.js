import Preprocessor from '../preprocessing/Preprocessor'
import {getBaseUrlAndQueryParams} from '../../network/URLUtilities'
import isNil from 'lodash/isNil'
import {PROCESSING_STATES} from '../SourceProcessing'

/**
 * Handles the preprocessing of a Web Feature Service. This retrieves the feature data from the service before sending to
 * the server to be turned into a geopackage feature table.
 */
export default class ArcGISFeatureServicePreprocessor extends Preprocessor {
  cancelled = false
  abortControllerMap = {}

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
   * @param streamId
   * @returns {Promise<any>}
   */
  async getAndSaveLayerFeaturesToFile (arcgisUrl, layer, withCredentials = false, streamId) {
    try {
      const controller = new AbortController()
      this.abortControllerMap[streamId] = controller

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

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        credentials: withCredentials ? 'include' : 'omit'
      })
      // eslint-disable-next-line no-undef
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let finished = false
      while (!finished) {
        const { value, done } = await reader.read()
        if (value) {
          await window.mapcache.appendToStream(streamId, value)
        }
        finished = done
      }
      // eslint-disable-next-line no-empty, no-unused-vars
    } catch (e) {
    } finally {
      delete this.abortControllerMap[streamId]
      window.mapcache.closeFileStream(streamId)
    }
  }

  /**
   * Gets the ArcGIS FS layers' data
   * @param url
   * @param layers
   * @param withCredentials
   * @param statusCallback
   * @returns {Promise<unknown>}
   */
  async getLayerFeatures (url, layers, withCredentials = false, statusCallback) {
    for (let i = 0; i < layers.length && !this.cancelled; i++) {
      const layer = layers[i]
      const filePath = window.mapcache.generateJsonFilePath(this.source.directory, window.mapcache.createUniqueID())
      const streamId = window.mapcache.openFileStream(filePath)
      layer.filePath = filePath
      await this.getAndSaveLayerFeaturesToFile(url, layer, withCredentials, streamId)
      statusCallback({type: PROCESSING_STATES.PREPROCESSING, message: 'Requesting data', completionPercentage: 25 * ((i + 1) / layers.length)})
    }
  }

  /**
   * Begins execution and returns an updated source configuration
   * @returns {*}
   */
  async preprocess (statusCallback) {
    await this.getLayerFeatures(this.source.url, this.source.layers, this.source.withCredentials, statusCallback)
    return this.source
  }

  /**
   * Cancels the preprocessing
   */
  cancel () {
    this.cancelled = true
    Object.keys(this.abortControllerMap).forEach(key => {
      this.abortControllerMap[key].abort()
    })
    this.abortControllerMap = {}
  }
}
