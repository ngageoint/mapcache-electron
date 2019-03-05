import request from 'request-promise-native'
import Layer from './Layer'
import * as Vendor from '../../vendor'

export default class XYZServerLayer extends Layer {
  _extent
  _style

  async initialize () {
    this._extent = this.extent

    // this.renderOverviewTile()
    return this
  }

  get configuration () {
    return {
      filePath: this.filePath,
      sourceLayerName: this.sourceLayerName,
      name: this.name,
      extent: this.extent,
      id: this.id,
      pane: 'tile',
      layerType: 'XYZServer',
      overviewTilePath: this.overviewTilePath,
      style: this.style,
      shown: this.shown || true
    }
  }

  get extent () {
    if (this._configuration.extent) {
      return this._configuration.extent
    }
    this._configuration.extent = [-180, -90, 180, 90]
    return this._configuration.extent
  }

  get style () {
    this._style = this._style || {
      opacity: 1
    }
    return this._style
  }

  get mapLayer () {
    if (this._mapLayer) return this._mapLayer

    this._mapLayer = Vendor.L.tileLayer(this.filePath, {
      pane: this.configuration.pane === 'tile' ? 'tilePane' : 'overlayPane'
    })

    this._mapLayer.id = this.id
    return this._mapLayer
  }

  async renderImageryTile (coords, tileCanvas, done) {
    if (!tileCanvas) {
      tileCanvas = document.createElement('canvas')
      tileCanvas.width = 256
      tileCanvas.height = 256
    }

    let ctx = tileCanvas.getContext('2d')
    ctx.clearRect(0, 0, tileCanvas.width, tileCanvas.height)

    let parameterizedUrl = this.filePath
    let url = parameterizedUrl.replace('{z}', coords.z).replace('{x}', coords.x).replace('{y}', coords.y)

    let result = await request({
      method: 'GET',
      url: url,
      encoding: null
    })

    return result
  }
}
