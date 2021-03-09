import path from 'path'
import UniqueIDUtilities from '../../UniqueIDUtilities'
import _ from 'lodash'

export default class Layer {
  initialized = false
  _configuration
  id
  filePath
  sourceLayerName
  name
  displayName
  constructor (configuration = {}) {
    this._configuration = _.cloneDeep(configuration)
    this.id = this._configuration.id || UniqueIDUtilities.createUniqueID()
    this.filePath = this._configuration.filePath
    this.sourceLayerName = this._configuration.sourceLayerName || defaultLayerName(this.filePath)
    this.name = this._configuration.name || this.sourceLayerName
    this.pane = this._configuration.pane
    this.style = this._configuration.style
    this.visible = !_.isNil(this._configuration.visible) ? this._configuration.visible : false
    this.sourceType = this._configuration.sourceType
    this.displayName = this._configuration.displayName || this.name
    this.layerType = this._configuration.layerType
    this.sourceDirectory = this._configuration.sourceDirectory
    this.sourceId = this._configuration.sourceId
    this.styleKey = this._configuration.styleKey || 0
    this.opacity = !_.isNil(this._configuration.opacity) ? this._configuration.opacity : 1.0
  }

  async initialize () {
    this.initialized = true
    return this
  }

  isInitialized () {
    return this.initialized
  }

  update (configuration = {}) {
    this._configuration = _.cloneDeep(configuration)
    this.styleKey = configuration.styleKey || 0
    this.opacity = !_.isNil(configuration.opacity) ? configuration.opacity : 1.0
    this.visible = !_.isNil(configuration.visible) ?  configuration.visible : false
  }

  getRepaintFields () {
    return ['styleKey']
  }

  close () {}

  get configuration () {
    return {
      ...this._configuration,
      ...{
        id: this.id,
        filePath: this.filePath,
        sourceLayerName: this.sourceLayerName,
        name: this.name,
        displayName: this.displayName,
        visible: this.visible,
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
