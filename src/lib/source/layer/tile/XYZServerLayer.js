import request from 'request-promise-native'
import TileLayer from './TileLayer'
import * as Vendor from '../../../vendor'
import superagent from 'superagent'
import jetpack from 'fs-jetpack'
import { remote } from 'electron'
import TileBoundingBoxUtils from '../../../tile/tileBoundingBoxUtils'

export default class XYZServerLayer extends TileLayer {
  async initialize () {
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: 'XYZServer'
      }
    }
  }

  get mapLayer () {
    if (this._mapLayer) return this._mapLayer
    let options = {
      pane: 'tilePane'
    }
    const headers = []
    if (this.credentials && this.credentials.type === 'basic') {
      headers.push({ header: 'Authorization', value: this.credentials.authorization })
    }
    if (headers.length > 0) {
      let TileLayerWithHeaders = Vendor.L.TileLayer.extend({
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
      let tileLayerWithHeaders = function (url, options, headers) {
        return new TileLayerWithHeaders(url, options, headers)
      }

      this._mapLayer = tileLayerWithHeaders(this.filePath, options, headers)
    } else {
      this._mapLayer = Vendor.L.tileLayer(this.filePath, options)
    }
    this._mapLayer.id = this.id
    return this._mapLayer
  }

  get extent () {
    if (this._configuration.extent) {
      return this._configuration.extent
    }
    this._configuration.extent = [-180, -90, 180, 90]
    return this._configuration.extent
  }

  async renderTile (coords, tileCanvas, done) {
    if (!tileCanvas) {
      tileCanvas = document.createElement('canvas')
      tileCanvas.width = 256
      tileCanvas.height = 256
    }
    let ctx = tileCanvas.getContext('2d')
    ctx.clearRect(0, 0, tileCanvas.width, tileCanvas.height)
    let options = {
      method: 'GET',
      url: this.filePath.replace('{z}', coords.z).replace('{x}', coords.x).replace('{y}', coords.y),
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
