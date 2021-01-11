import * as Vendor from '../../vendor'
import axios from 'axios'

export default class XYZServerLayer {
  static constructMapLayer (layerModel) {
    let mapLayer = null
    let options = {
      pane: 'overlayPane',
      zIndex: 401
    }
    const headers = []
    if (layerModel.credentials && layerModel.credentials.type === 'basic') {
      headers.push({ header: 'Authorization', value: layerModel.credentials.authorization })
    }
    if (headers.length > 0) {
      let TileLayerWithHeaders = Vendor.L.TileLayer.extend({
        initialize: function (url, options, headers) {
          Vendor.L.TileLayer.WMS.prototype.initialize.call(this, url, options)
          this.headers = headers
        },
        createTile (coords, done) {
          const img = document.createElement('img')
          let headers = {}
          for (let i = 0; i < this.headers.length; i++) {
            headers[this.headers[i].header.toLowerCase()] = this.headers[i].value
          }
          axios({
            method: 'get',
            url: this.getTileUrl(coords),
            responseType: 'arraybuffer',
            headers: headers
          }).then((response) => {
            img.src = 'data:' + response.headers['content-type'] + ';base64,' + Buffer.from(response.data).toString('base64')
            done(null, img)
          })
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.error(err)
          })
          return img
        }
      })
      let tileLayerWithHeaders = function (url, options, headers) {
        return new TileLayerWithHeaders(url, options, headers)
      }
      mapLayer = tileLayerWithHeaders(layerModel.filePath, options, headers)
    } else {
      mapLayer = Vendor.L.tileLayer(layerModel.filePath, options)
    }
    mapLayer.id = layerModel.id

    let opacity = 1.0
    if (layerModel.opacity !== null && layerModel.opacity !== undefined) {
      opacity = layerModel.opacity
    }
    mapLayer.setOpacity(opacity)
    return mapLayer
  }
}
