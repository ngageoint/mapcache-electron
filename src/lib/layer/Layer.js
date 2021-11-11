import { createUniqueID } from '../util/UniqueIDUtilities'
import isNil from 'lodash/isNil'
import cloneDeep from 'lodash/cloneDeep'

/**
 * Layer is a class for holding information for a processed source. This information will be used by a renderer to display content on the map.
 */
export default class Layer {
  _configuration
  id
  directory
  sourceDirectory
  filePath
  sourceLayerName
  name
  displayName
  constructor (configuration = {}) {
    this._configuration = cloneDeep(configuration)
    this.id = this._configuration.id || createUniqueID()
    this.directory = this._configuration.directory
    this.sourceDirectory = this._configuration.sourceDirectory
    this.filePath = this._configuration.filePath
    this.sourceLayerName = this._configuration.sourceLayerName
    this.name = this._configuration.name || this.sourceLayerName
    this.pane = this._configuration.pane
    this.style = this._configuration.style || {}
    this.visible = !isNil(this._configuration.visible) ? this._configuration.visible : false
    this.sourceType = this._configuration.sourceType
    this.displayName = this._configuration.displayName || this.name
    this.layerType = this._configuration.layerType
    this.styleKey = this._configuration.styleKey || 0
    this.opacity = !isNil(this._configuration.opacity) ? this._configuration.opacity : 1.0
  }

  update (configuration = {}) {
    this._configuration = cloneDeep(configuration)
    this.style = configuration.style
    this.styleKey = configuration.styleKey || 0
    this.opacity = !isNil(configuration.opacity) ? configuration.opacity : 1.0
    this.visible = !isNil(configuration.visible) ?  configuration.visible : false
  }

  getRepaintFields () {
    return ['styleKey']
  }

  setRenderer (renderer) {
    this.renderer = renderer
  }

  async renderTile (requestId, coords, size, callback) {
    if (this.renderer) {
      this.renderer.renderTile(requestId, coords, size, callback)
    } else {
      callback('Renderer not set...', null)
    }
  }

  cancel () {}

  get configuration () {
    return {
      ...this._configuration,
      ...{
        id: this.id,
        directory: this.directory,
        sourceDirectory: this.sourceDirectory,
        filePath: this.filePath,
        sourceLayerName: this.sourceLayerName,
        name: this.name,
        displayName: this.displayName,
        visible: this.visible,
        style: this.style,
        sourceType: this.sourceType,
        styleKey: this.styleKey,
        opacity: this.opacity
      }
    }
  }
}
