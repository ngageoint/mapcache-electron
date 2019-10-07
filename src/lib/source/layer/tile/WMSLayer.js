import TileLayer from './TileLayer'
import * as Vendor from '../../../vendor'
import TileBoundingBoxUtils from '../../../tile/tileBoundingBoxUtils'
import proj4 from 'proj4'
import request from 'request-promise-native'
import superagent from 'superagent'
import jetpack from 'fs-jetpack'
import { remote } from 'electron'

export default class WMSLayer extends TileLayer {
  async initialize () {
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: 'WMS'
      }
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
    let southWest = Vendor.L.latLng(this.extent[1], this.extent[0])
    let northEast = Vendor.L.latLng(this.extent[3], this.extent[2])
    let bounds = Vendor.L.latLngBounds(southWest, northEast)
    // parse options...
    const options = {
      layers: this.sourceLayerName,
      bounds: bounds,
      transparent: true,
      format: 'image/png'
    }
    Vendor.L.TileLayer.WMSHeader = Vendor.L.TileLayer.WMS.extend({
      initialize: function (url, options, headers) {
        Vendor.L.TileLayer.WMS.prototype.initialize.call(this, url, options)
        this.headers = headers
      },
      createTile (coords, done) {
        const url = this.getTileUrl(coords)
        const img = document.createElement('img')
        let getUrl = superagent.get(url)

        for (let i = 0; i < this.headers.length; i++) {
          getUrl = getUrl.set(this.headers[i].header, this.headers[i].value)
        }
        getUrl.responseType('blob')
          .then((response) => {
            img.src = 'data:' + response.headers['content-type'] + ';base64,' + Buffer.from(response.body).toString('base64')
            done(null, img)
          })
        return img
      }
    })
    let wmsHeader = function (url, options, headers) {
      return new Vendor.L.TileLayer.WMSHeader(url, options, headers)
    }
    const headers = []
    if (this.credentials && (this.credentials.type === 'basic' || this.credentials.type === 'bearer')) {
      headers.push({ header: 'Authorization', value: this.credentials.authorization })
      headers.push({ header: 'User-Agent', value: remote.getCurrentWebContents().session.getUserAgent() })
    }
    this._mapLayer = wmsHeader(this.filePath.substring(0, this.filePath.indexOf('?') + 1), options, headers)
    this._mapLayer.id = this.id
    return this._mapLayer
  }

  async renderTile (coords, tile, done) {
    let {x, y, z} = coords

    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
    let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
    let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])
    let fullExtent = this.extent
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

    let options = {
      method: 'GET',
      url: this.filePath + '&request=GetMap&layers=' + this.sourceLayerName + '&width=256&height=256&format=image/png&transparent=true&' + referenceSystemName + '=crs:84&bbox=' + bbox,
      encoding: null,
      headers: {
        'User-Agent': remote.getCurrentWebContents().session.getUserAgent()
      }
    }
    if (this.credentials) {
      if (this.credentials.type === 'basic') {
        if (!options.headers) {
          options.headers = {}
        }
        options.headers['Authorization'] = this.credentials.authorization
      }
    }
    return request(options)
  }

  async renderOverviewTile () {
    let overviewTilePath = this.overviewTilePath
    if (!jetpack.exists(overviewTilePath)) {
      const fullExtent = this.extent
      let coords = TileBoundingBoxUtils.determineXYZTileInsideExtent([fullExtent[0], fullExtent[1]], [fullExtent[2], fullExtent[3]])
      let canvas = Vendor.L.DomUtil.create('canvas')
      canvas.width = 256
      canvas.height = 256
      this.renderTile(coords, canvas, function (err, tile) {
        if (err) console.log('err', err)
        canvas.toBlob(function (blob) {
          let reader = new FileReader()
          reader.addEventListener('loadend', function () {
            jetpack.write(overviewTilePath, Buffer.from(reader.result))
          })
          reader.readAsArrayBuffer(blob)
        })
      })
    }
  }
}
