import Layer from '../Layer'

export default class TileLayer extends Layer {
  async initialize () {
    this.style = this._configuration.style || {}
    await super.initialize()
    return this
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

  renderTile () {
    throw new Error('Abstract method to be implemented in subclass')
  }
}
