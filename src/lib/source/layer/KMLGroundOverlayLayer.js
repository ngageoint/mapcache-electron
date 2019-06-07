import Layer from './Layer'
import * as Vendor from '../../vendor'
import fs from 'fs'

export default class KMLGroundOverlayLayer extends Layer {
  _extent

  async initialize () {
    this._extent = this.extent
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
      layerType: 'KMLGroundOverlay',
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

  get mapLayer () {
    if (this._mapLayer) return this._mapLayer
    // call get capabilities and get the layers
    let southWest = Vendor.L.latLng(this._configuration.extent[1], this._configuration.extent[0])
    let northEast = Vendor.L.latLng(this._configuration.extent[3], this._configuration.extent[2])
    const imageFileType = this.filePath.substring(this.filePath.lastIndexOf('.') + 1)
    let base64URL = 'data:image/' + imageFileType + ';base64,' + fs.readFileSync(this.filePath, { encoding: 'base64' })
    this._mapLayer = Vendor.L.imageOverlay(base64URL, [southWest, northEast])
    this._mapLayer.id = this.id
    return this._mapLayer
  }
}
