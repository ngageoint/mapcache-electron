import Layer from '../Layer'

export default class TileLayer extends Layer {
  constructor (configuration = {}) {
    super(configuration)
    this.extent = configuration.extent || [-180, -90, 180, 90]
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        pane: 'tile',
        extent: this.extent
      }
    }
  }

  update (configuration) {
    super.update(configuration)
    this.extent = configuration.extent
  }
}
