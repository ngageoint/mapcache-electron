import path from 'path'
import { userDataDir } from '../../settings/Settings'

export default class Layer {
  _configuration
  id
  filePath
  sourceLayerName
  name
  mapLayers
  constructor (configuration = {}) {
    // filePath, sourceLayerName = defaultLayerName(filePath), name = defaultLayerName(filePath)) {
    this._configuration = configuration
    this.id = this._configuration.id || createId()
    this.filePath = this._configuration.filePath
    this.sourceLayerName = this._configuration.sourceLayerName || defaultLayerName(this.filePath)
    this.name = this._configuration.name || this.sourceLayerName
    this.overviewTilePath = this.cacheFolder.dir(this.id).path('overviewTile.png')
    this.pane = configuration.pane
    this._style = this._configuration.style
    this.shown = this._configuration.shown || true
  }

  async initialize () {
    throw new Error('Abstract method to be implemented in sublcass')
  }

  get cacheFolder () {
    return userDataDir().dir(this.id)
  }

  get configuration () {
    return Object.assign(this._configuration, {
      id: this.id,
      filePath: this.filePath,
      sourceLayerName: this.sourceLayerName,
      name: this.name,
      overviewTilePath: this.overviewTilePath,
      shown: this.shown || true
    })
  }
}

function createId () {
  function s4 () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}

function defaultLayerName (filePath) {
  return path.basename(filePath, path.extname(filePath))
}
