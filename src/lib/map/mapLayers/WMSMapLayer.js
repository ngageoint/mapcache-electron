import * as Vendor from '../../vendor'
import GeoServiceUtilities from '../../GeoServiceUtilities'
import axios from 'axios'
import ActionUtilities from '../../ActionUtilities'
import EventBus from '../../../EventBus'
import ServiceConnectionUtils from '../../ServiceConnectionUtils'

export default class WMSLayer {
  static constructMapLayer (layerModel, mapPane = 'overlayPane') {
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
      zIndex: 401,
      pane: mapPane
    }
    Vendor.L.TileLayer.WMSHeader = Vendor.L.TileLayer.WMS.extend({
      initialize: function (url, options) {
        Vendor.L.TileLayer.WMS.prototype.initialize.call(this, url, options)
        this.error = null
      },
      hasError () {
        return this.error !== null && this.error !== undefined
      },
      setError (error) {
        if (error.response) {
          this.error = {
            status: error.response.status,
            statusText: error.response.statusText,
            authType: ServiceConnectionUtils.getAuthenticationMethod(error.response)

          }
          ActionUtilities.setSourceError({id: this.id, error: this.error})
        } else if (error.request) {
          if (navigator.onLine) {
            this.error = {
              status: -1,
              statusText: 'Unable to reach server.'
            }
            ActionUtilities.setSourceError({id: this.id, error: this.error})
          } else {
            // notify there may be a network error
            EventBus.$emit(EventBus.EventTypes.NETWORK_ERROR)
          }
        }
      },
      createTile (coords, done) {
        const img = document.createElement('img')
        if (!this.error) {
          axios({
            method: 'get',
            url: this.getTileUrl(coords),
            responseType: 'arraybuffer'
          }).then((response) => {
            img.src = 'data:' + response.headers['content-type'] + ';base64,' + Buffer.from(response.data).toString('base64')
            done(null, img)
          })
            .catch((err) => {
              done (err, null)
              this.setError((err))
            })
        } else {
          done (this.error, img)
        }
        return img
      }
    })
    let wmsHeader = function (url, options, headers) {
      return new Vendor.L.TileLayer.WMSHeader(url, options, headers)
    }
    let mapLayer = wmsHeader(GeoServiceUtilities.getBaseURL(layerModel.filePath), options)
    mapLayer.id = layerModel.id
    let opacity = 1.0
    if (layerModel.opacity !== null && layerModel.opacity !== undefined) {
      opacity = layerModel.opacity
    }
    mapLayer.setOpacity(opacity)
    return mapLayer
  }
}
