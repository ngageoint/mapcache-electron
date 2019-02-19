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
      pane: 'tilePane',
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
    if (this._mapLayer) return [this._mapLayer]

    this._mapLayer = Vendor.L.tileLayer(this.filePath, {
      pane: this.configuration.pane
    })

    this._mapLayer.id = this.id
    return [this._mapLayer]
  }

  // renderOverviewTile () {
  //   let overviewTilePath = this.overviewTilePath
  // if (!jetpack.exists(overviewTilePath)) {
  //   var fullExtent = this.extent
  //   let coords = TileBoundingBoxUtils.determineXYZTileInsideExtent([fullExtent[0], fullExtent[1]], [fullExtent[2], fullExtent[3]])
  //   let canvas = Vendor.L.DomUtil.create('canvas')
  //   canvas.width = 500
  //   canvas.height = 500
  //   this.renderer.renderTile(coords, canvas, function (err, tile) {
  //     if (err) console.log('err', err)
  //     canvas.toBlob(function (blob) {
  //       var reader = new FileReader()
  //       reader.addEventListener('loadend', function () {
  //         jetpack.write(overviewTilePath, Buffer.from(reader.result))
  //       })
  //       reader.readAsArrayBuffer(blob)
  //     })
  //   })
  // }
  // }
}
