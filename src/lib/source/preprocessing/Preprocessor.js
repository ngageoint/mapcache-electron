/**
 * Preprocessor performs preprocessing on a user source prior to sending to the server for processing.
 * i.e. if network requests are required for processing, they occur in the browser window.
 */
export default class Preprocessor {
  source

  constructor (source) {
    this.source = Object.assign({}, source)
  }

  preprocess () {

  }

  cancel () {

  }
}
