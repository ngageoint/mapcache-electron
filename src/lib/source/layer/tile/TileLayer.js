import Layer from '../Layer'

export default class TileLayer extends Layer {
  constructor (configuration = {}) {
    super(configuration)
    this.style = configuration.style || {}
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
  }
}
