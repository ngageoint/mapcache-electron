import TileLayer from './TileLayer'
import LayerTypes from '../LayerTypes'

export default class XYZFileLayer extends TileLayer {
  constructor (configuration = {}) {
    super (configuration)
    this.minZoom = configuration.minZoom
    this.maxZoom = configuration.maxZoom
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: LayerTypes.XYZ_FILE,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom
      }
    }
  }

  update (configuration) {
    super.update(configuration)
  }

  get extent () {
    if (this._configuration.extent) {
      return this._configuration.extent
    }
    this._configuration.extent = [-180, -90, 180, 90]
    return this._configuration.extent
  }
}
