import * as Vendor from '../../vendor'
import axios from 'axios'
import ActionUtilities from '../../ActionUtilities'
import EventBus from '../../../EventBus'
import ServiceConnectionUtils from '../../ServiceConnectionUtils'

export default class XYZServerLayer {
  static constructMapLayer (layerModel, mapPane = 'overlayPane') {
    let options = {
      pane: mapPane,
      zIndex: 401,
      subdomains: layerModel.subdomains
    }
    let TileLayerWithHeaders = Vendor.L.TileLayer.extend({
      initialize: function (url, options) {
        Vendor.L.TileLayer.WMS.prototype.initialize.call(this, url, options)
        this.error = null
      },
      hasError () {
        return this.error !== null && this.error !== undefined
      },
      setError (error) {
        if (error.response) {
          // ignore 404 - Not Found
          if (error.response.status !== 404) {
            this.error = {
              status: error.response.status,
              statusText: error.response.statusText,
              authType: ServiceConnectionUtils.getAuthenticationMethod(error.response)
            }
            ActionUtilities.setSourceError({id: this.id, error: this.error})
          }
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
    let tileLayerWithHeaders = function (url, options) {
      return new TileLayerWithHeaders(url, options)
    }
    // Leaflet requires the XYZ url to not contain $ and to have lower case coordinate designators
    const mapLayer = tileLayerWithHeaders(layerModel.filePath, options)
    mapLayer.id = layerModel.id

    let opacity = 1.0
    if (layerModel.opacity !== null && layerModel.opacity !== undefined) {
      opacity = layerModel.opacity
    }
    mapLayer.setOpacity(opacity)
    return mapLayer
  }
}
