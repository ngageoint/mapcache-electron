import * as Vendor from '../../vendor'
import GeoServiceUtilities from '../../GeoServiceUtilities'
import axios from 'axios'

export default class WMSLayer {
  static constructMapLayer (layerModel) {
    // call get capabilities and get the layers
    let southWest = Vendor.L.latLng(layerModel.extent[1], layerModel.extent[0])
    let northEast = Vendor.L.latLng(layerModel.extent[3], layerModel.extent[2])
    let bounds = Vendor.L.latLngBounds(southWest, northEast)
    // parse options...
    const options = {
      layers: layerModel.layers.join(),
      bounds: bounds,
      transparent: true,
      format: 'image/png',
      zIndex: 201
    }
    Vendor.L.TileLayer.WMSHeader = Vendor.L.TileLayer.WMS.extend({
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
    let wmsHeader = function (url, options, headers) {
      return new Vendor.L.TileLayer.WMSHeader(url, options, headers)
    }
    const headers = []
    if (layerModel.credentials && (layerModel.credentials.type === 'basic' || layerModel.credentials.type === 'bearer')) {
      headers.push({ header: 'Authorization', value: layerModel.credentials.authorization })
    }
    // headers.push({ header: 'User-Agent', value: 'MapCache/1.0.0' })
    let mapLayer = wmsHeader(GeoServiceUtilities.getBaseURL(layerModel.filePath), options, headers)
    mapLayer.id = layerModel.id
    return mapLayer
  }
}
