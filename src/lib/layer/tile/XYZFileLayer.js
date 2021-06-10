import TileLayer from './TileLayer'
import { XYZ_FILE } from '../LayerTypes'

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
        layerType: XYZ_FILE,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom
      }
    }
  }

  update (configuration) {
    super.update(configuration)
  }

  cancel (coords) {
    this.renderer.cancel(coords)
  }
}
