import * as Vendor from '../../vendor'
import superagent from 'superagent'

export default class XYZServerLayer {
  static constructMapLayer (layerModel) {
    let mapLayer = null
    let options = {
      pane: 'tilePane',
      zIndex: 201
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
      console.log(layerModel.filePath)
      mapLayer = tileLayerWithHeaders(layerModel.filePath, options, headers)
    } else {
      mapLayer = Vendor.L.tileLayer(layerModel.filePath, options)
    }
    mapLayer.id = layerModel.id
    return mapLayer
  }
}
