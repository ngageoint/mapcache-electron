import {SERVICE_TYPE} from '../../network/HttpUtilities'
import ArcGISFeatureServicePreprocessor from './ArcGISFeatureServicePreprocessor'
import WebFeatureServicePreProcessor from './WebFeatureServicePreProcessor'

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
    }
  }

  /**
   * Begins execution and returns an updated source configuration
   * @returns {*}
   */
  async preprocess () {
    return this.preprocessor.preprocess()
  }

  /**
   * Cancels the preprocessing
   */
  cancel () {
    this.preprocessor.cancel()
  }
}
