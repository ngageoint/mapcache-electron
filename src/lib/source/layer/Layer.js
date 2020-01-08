import path from 'path'
import UniqueIDUtilities from '../../UniqueIDUtilities'

export default class Layer {
  _configuration
  id
  filePath
  credentials
  sourceLayerName
  name
  displayName
  constructor (configuration = {}) {
    this._configuration = configuration
    this.id = this._configuration.id || UniqueIDUtilities.createUniqueID()
    this.filePath = this._configuration.filePath
    this.credentials = this._configuration.credentials
    this.sourceLayerName = this._configuration.sourceLayerName || defaultLayerName(this.filePath)
    this.name = this._configuration.name || this.sourceLayerName
    this.pane = configuration.pane
    this.style = this._configuration.style
    this.shown = this._configuration.shown || true
    this.expanded = this._configuration.expanded || true
    this.images = this._configuration.images
    this.sourceFilePath = this._configuration.sourceFilePath
    this.sourceType = this._configuration.sourceType
    this.displayName = this._configuration.displayName || this.name
    this.layerType = this._configuration.layerType
  }

  async initialize () {
    throw new Error('Abstract method to be implemented in sublcass')
  }

  get configuration () {
    return {
      ...this._configuration,
      ...{
        id: this.id,
        filePath: this.filePath,
        credentials: this.credentials,
        sourceLayerName: this.sourceLayerName,
        name: this.name,
        displayName: this.displayName,
        shown: this.shown || true,
        expanded: this.expanded || true,
        style: this.style,
        images: this.images,
        sourceFilePath: this.sourceFilePath,
        sourceType: this.sourceType
      }
    }
  }
}

function defaultLayerName (filePath) {
  return path.basename(filePath, path.extname(filePath))
}
