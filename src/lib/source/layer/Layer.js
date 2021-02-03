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
    this.visible = this._configuration.visible || false
    this.sourceType = this._configuration.sourceType
    this.displayName = this._configuration.displayName || this.name
    this.layerType = this._configuration.layerType
    this.sourceDirectory = this._configuration.sourceDirectory
    this.sourceId = this._configuration.sourceId
    this.styleKey = this._configuration.styleKey || 0
    this.opacity = this._configuration.opacity
    if (this._configuration.opacity === null || this._configuration.opacity === undefined) {
      this.opacity = 1.0
    }
  }

  async initialize () {
    throw new Error('Abstract method to be implemented in subclass')
  }

  close () {

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
        visible: this.visible || false,
        style: this.style,
        sourceType: this.sourceType,
        sourceDirectory: this.sourceDirectory,
        sourceId: this.sourceId,
        styleKey: this.styleKey,
        opacity: this.opacity
      }
    }
  }
}

function defaultLayerName (filePath) {
  return path.basename(filePath, path.extname(filePath))
}
