import Layer from './Layer'
import * as Vendor from '../../vendor'
import TileBoundingBoxUtils from '../../tile/tileBoundingBoxUtils'
import proj4 from 'proj4'
import request from 'request-promise-native'

export default class WMSLayer extends Layer {
  _extent
  _style

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
      layerType: 'WMS',
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

    // call get capabilities and get the layers
    let southWest = Vendor.L.latLng(this._configuration.extent[1], this._configuration.extent[0])
    let northEast = Vendor.L.latLng(this._configuration.extent[3], this._configuration.extent[2])
    let bounds = Vendor.L.latLngBounds(southWest, northEast)
    // parse options...
    const options = {
      layers: this._configuration.sourceLayerName,
      bounds: bounds,
      transparent: true,
      format: 'image/png'
    }

    this._mapLayer = Vendor.L.tileLayer.wms(this.filePath.substring(0, this.filePath.indexOf('?') + 1), options)

    this._mapLayer.id = this.id
    return this._mapLayer
  }

  async renderImageryTile (coords, tile, done) {
    let {x, y, z} = coords

    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
    let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
    let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])
    let fullExtent = this._extent
    if (!TileBoundingBoxUtils.tileIntersects(tileUpperRight, tileLowerLeft, [fullExtent[2], fullExtent[3]], [fullExtent[0], fullExtent[1]])) {
      if (done) {
        return done(null, tile)
      }
      return
    }

    if (!tile) {
      tile = document.createElement('canvas')
      tile.width = 256
      tile.height = 256
    }

    let ctx = tile.getContext('2d')
    ctx.clearRect(0, 0, tile.width, tile.height)

    let referenceSystemName = 'srs'
    let bbox = tileLowerLeft[0] + ',' + tileLowerLeft[1] + ',' + tileUpperRight[0] + ',' + tileUpperRight[1]
    if (this.filePath.indexOf('1.3.0') > 0) {
      referenceSystemName = 'crs'
    }

    let url = this.filePath + '&request=GetMap&layers=' + this._configuration.sourceLayerName + '&width=256&height=256&format=image/png&transparent=true&' + referenceSystemName + '=crs:84&bbox=' + bbox
    return request({
      method: 'GET',
      url: url,
      encoding: null
    })
  }
}
