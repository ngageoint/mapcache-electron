import * as Vendor from '../../vendor'
import GeoServiceUtilities from '../../GeoServiceUtilities'
import ActionUtilities from '../../ActionUtilities'
import EventBus from '../../../EventBus'
import ServiceConnectionUtils from '../../ServiceConnectionUtils'
import NetworkConstants from '../../NetworkConstants'
import _ from 'lodash'
import CancellableTileRequest from '../../CancellableTileRequest'

export default class WMSLayer {
  static constructMapLayer (layerModel, mapPane = 'overlayPane', isPreview = false) {
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

    Vendor.L.TileLayer.MapCacheWMS = Vendor.L.TileLayer.WMS.extend({
      initialize: function (layerModel, options) {
        Vendor.L.TileLayer.WMS.prototype.initialize.call(this, GeoServiceUtilities.getBaseURL(layerModel.filePath), options)
        this.retryAttempts = !_.isNil(layerModel.retryAttempts) ? layerModel.retryAttempts : NetworkConstants.DEFAULT_RETRY_ATTEMPTS
        this.timeout = layerModel.timeoutMs || NetworkConstants.DEFAULT_TIMEOUT
        this.error = null
        this.axiosRequestScheduler = ServiceConnectionUtils.getAxiosRequestScheduler(layerModel.rateLimit || NetworkConstants.DEFAULT_RATE_LIMIT)
      },
      updateNetworkSettings (configuration) {
        if (!_.isNil(configuration.rateLimit)) {
          if (!_.isNil(this.axiosRequestScheduler)) {
            this.axiosRequestScheduler.destroy()
          }
          this.axiosRequestScheduler = ServiceConnectionUtils.getAxiosRequestScheduler(configuration.rateLimit || NetworkConstants.DEFAULT_RATE_LIMIT)
        }
        if (!_.isNil(configuration.retryAttempts)) {
          this.retryAttempts = configuration.retryAttempts
        }
        if (!_.isNil(configuration.timeoutMs)) {
          this.timeout = configuration.timeoutMs
        }
      },
      hasError () {
        return this.error !== null && this.error !== undefined
      },
      createTile (coords, done) {
        const img = document.createElement('img')
        if (!this.hasError()) {
          const cancellableTileRequest = new CancellableTileRequest()
          const unloadListener = (event) => {
            if (coords.z === event.coords.z && coords.x === event.coords.x && coords.y === event.coords.y) {
              cancellableTileRequest.cancel()
            }
          }
          this.on('tileunload', unloadListener)
          const url = this.getTileUrl(coords)
          cancellableTileRequest.requestTile(this.axiosRequestScheduler, url, this.retryAttempts, this.timeout).then(({dataUrl, error}) => {
            if (!_.isNil(error) && !isPreview) {
              this.setError(error)
            }
            if (!_.isNil(dataUrl)) {
              img.src = dataUrl
            }
            this.off('tileunload', unloadListener)
            done(error, img)
          })
        }
        return img
      },
      setError (error) {
        // not a timeout error
        if (error.code !== "ECONNABORTED") {
          if (error.response && (error.response.status >= 500 || error.response.status === 401)) {
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
        }
      }
    })

    let mapLayer = new Vendor.L.TileLayer.MapCacheWMS(layerModel, options)
    mapLayer.id = layerModel.id
    let opacity = 1.0
    if (layerModel.opacity !== null && layerModel.opacity !== undefined) {
      opacity = layerModel.opacity
    }
    mapLayer.setOpacity(opacity)
    return mapLayer
  }
}
