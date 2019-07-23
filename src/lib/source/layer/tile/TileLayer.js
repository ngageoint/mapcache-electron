import Layer from '../Layer'
import MapcacheMapLayer from '../../../map/MapcacheMapLayer'

export default class TileLayer extends Layer {
  _mapLayer

  async initialize () {
    this.style = this._configuration.style || {
      opacity: 1
    }
    await this.renderOverviewTile()
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

  get mapLayer () {
    if (!this._mapLayer) {
      this._mapLayer = new MapcacheMapLayer({
        layer: this,
        pane: 'tilePane'
      })
      this._mapLayer.id = this.id
    }
    return this._mapLayer
  }

  renderTile () {
    throw new Error('Abstract method to be implemented in subclass')
  }

  renderOverviewTile () {
    throw new Error('Abstract method to be implemented in subclass')
  }
}
