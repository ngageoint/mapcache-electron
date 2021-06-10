import TileLayer from './TileLayer'
import { GEOPACKAGE } from '../LayerTypes'

export default class GeoPackageTileLayer extends TileLayer {

  constructor (configuration) {
    super(configuration)
    this.extent = configuration.extent
    this.minZoom = configuration.minZoom
    this.maxZoom = configuration.maxZoom
  }

  update (configuration) {
    super.update(configuration)
  }

  setRenderer (renderer) {
    this.renderer = renderer
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: GEOPACKAGE,
        extent: this.extent,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom
      }
    }
  }

  cancel (coords) {
    this.renderer.cancel(coords)
  }
}
