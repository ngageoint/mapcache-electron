import {SERVICE_TYPE} from '../../network/HttpUtilities'
import ArcGISFeatureServicePreprocessor from '../arcgis/ArcGISFeatureServicePreprocessor'
import WebFeatureServicePreProcessor from '../wfs/WebFeatureServicePreProcessor'
import OverpassPreProcessor from '../overpass/OverpassPreProcessor'

/**
 * Handles the preprocessing of a source
 */
export default class PreprocessSource {
  preprocessor

  /**
   * Constructor
   * @param source (will be cloned)
   */
  constructor (source) {
    if (source.serviceType === SERVICE_TYPE.ARCGIS_FS) {
      this.preprocessor = new ArcGISFeatureServicePreprocessor(source)
    } else if (source.serviceType === SERVICE_TYPE.WFS) {
      this.preprocessor = new WebFeatureServicePreProcessor(source)
    } else if (source.serviceType === SERVICE_TYPE.OVERPASS) {
      this.preprocessor = new OverpassPreProcessor(source)
    }
  }

  /**
   * Begins execution and returns an updated source configuration
   * @param statusCallback
   * @returns {*}
   */
  async preprocess (statusCallback) {
    return this.preprocessor.preprocess(statusCallback)
  }

  /**
   * Cancels the preprocessing
   */
  cancel () {
    this.preprocessor.cancel()
  }
}
