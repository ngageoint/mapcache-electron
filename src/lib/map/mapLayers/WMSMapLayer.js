import * as Vendor from '../../vendor'
import superagent from 'superagent'
import { remote } from 'electron'
import GeoServiceUtilities from '../../GeoServiceUtilities'

export default class WMSLayer {
  static constructMapLayer (layerModel) {
    // call get capabilities and get the layers
    let southWest = Vendor.L.latLng(layerModel.extent[1], layerModel.extent[0])
    let northEast = Vendor.L.latLng(layerModel.extent[3], layerModel.extent[2])
    let bounds = Vendor.L.latLngBounds(southWest, northEast)
    // parse options...
    const options = {
      layers: layerModel.sourceLayerName,
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
          .catch((err) => {
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
    headers.push({ header: 'User-Agent', value: remote.getCurrentWebContents().session.getUserAgent() })
    let mapLayer = wmsHeader(GeoServiceUtilities.getBaseURL(layerModel.filePath), options, headers)
    mapLayer.id = layerModel.id
    return mapLayer
  }
}
