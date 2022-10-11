import isNil from 'lodash/isNil'
import {
  DEFAULT_RATE_LIMIT,
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_TIMEOUT, getAuthenticationMethod, isTimeoutError,
  SERVICE_TYPE, TIMEOUT_STATUS
} from '../../../network/HttpUtilities'
import { getAxiosRequestScheduler, testServiceConnection } from '../../../network/ServiceConnectionUtils'
import { constructRenderer } from '../renderer/RendererFactory'
import { WMS, WMTS, XYZ_SERVER } from '../../../layer/LayerTypes'
import EventBus from '../../../vue/EventBus'
import { getWGS84BoundingBoxFromXYZ } from '../../../util/xyz/WGS84XYZTileUtilities'
import CancellableTileRequest from '../../../network/CancellableTileRequest'
import { getClippingRegion } from '../../../util/xyz/XYZTileUtilities'
import { WEB_MERCATOR } from '../../../projection/ProjectionConstants'
import SlowServerNotifier from '../../../geopackage/SlowServerNotifier'

/**
 * The map cache networking map layer is a wrapper for WMS/XYZ and other services
 */
export default function (L) {
  L.TileLayer.MapCacheRemoteLayer = L.TileLayer.extend({
    initialize: function (options) {
      this.originalOptions = options
      this.crs = options.crs ? options.crs.code : L.CRS.EPSG3857.code
      L.TileLayer.prototype.initialize.call(this, window.mapcache.getBaseURL(options.layer.filePath), options)
      this.outstandingTileRequests = {}
      this.layer = options.layer
      this.layerBounds = this.crs === WEB_MERCATOR ? window.mapcache.convertToWebMercator(this.layer.extent) : this.layer.extent.slice()
      this.id = options.layer.id
      this.retryAttempts = !isNil(this.layer.retryAttempts) ? this.layer.retryAttempts : DEFAULT_RETRY_ATTEMPTS
      this.timeout = !isNil(this.layer.timeoutMs) ? this.layer.timeoutMs : DEFAULT_TIMEOUT
      this.error = null
      this.axiosRequestScheduler = getAxiosRequestScheduler(this.layer.rateLimit || DEFAULT_RATE_LIMIT)
      this.layer.setRenderer(constructRenderer(this.layer, false))
      this.serverMonitor = new SlowServerNotifier()
      this.on('tileunload', (event) => {
        event.tile.onload = null
        event.tile.src = ''
        if (event.tile.requestId != null && this.outstandingTileRequests[event.tile.requestId] != null) {
          this.outstandingTileRequests[event.tile.requestId].cancel()
          delete this.outstandingTileRequests[event.tile.requestId]
        }
      })
    },
    async testConnection (ignoreTimeoutError = true) {
      const options = {
        timeout: this.timeout,
        withCredentials: this.layer.withCredentials
      }
      if (this.layer.layerType === XYZ_SERVER) {
        options.subdomains = this.layer.subdomains || []
        let { error } = await testServiceConnection(this.layer.filePath, SERVICE_TYPE.XYZ, options)
        if (!isNil(error) && !isTimeoutError(error) || !ignoreTimeoutError) {
          throw error
        }
      } else if (this.layer.layerType === WMS) {
        options.version = this.layer.version
        let { serviceInfo, error } = await testServiceConnection(this.layer.filePath, SERVICE_TYPE.WMS, options)
        if (!isNil(serviceInfo)) {
          // verify that this source is still valid when compared to the service info
          const layers = this.layer.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) !== -1)
          if (layers.length !== this.layer.layers.length) {
            const missingLayers = this.layer.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) === -1)
            error = {
              status: 400,
              statusText: 'The following layer' + (missingLayers.length > 1 ? 's' : '') + ' no longer exist: ' + missingLayers.join(', ')
            }
          }
        }
        if (!isNil(error) && (!isTimeoutError(error) || !ignoreTimeoutError)) {
          throw error
        }
      } else if (this.layer.layerType === WMTS) {
        options.version = this.layer.version
        let { serviceInfo, error } = await testServiceConnection(this.layer.filePath, SERVICE_TYPE.WMTS, options)
        if (!isNil(serviceInfo)) {
          // verify that this source is still valid when compared to the service info
          const layers = this.layer.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) !== -1)
          if (layers.length !== this.layer.layers.length) {
            const missingLayers = this.layer.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) === -1)
            error = {
              status: 400,
              statusText: 'The following layer' + (missingLayers.length > 1 ? 's' : '') + ' no longer exist: ' + missingLayers.join(', ')
            }
          }
        }
        if (!isNil(error) && (!isTimeoutError(error) || !ignoreTimeoutError)) {
          throw error
        }
      }
    },
    getLayer () {
      return this.layer
    },
    hasError () {
      return this.error != null
    },
    setError (error) {
      if (error.status === TIMEOUT_STATUS) {
        this.error = error
        window.mapcache.setSourceError({ id: this.id, error: this.error })
      } else if (error.response && (error.response.status >= 500 || error.response.status === 401)) {
        this.error = {
          status: error.response.status,
          statusText: error.response.statusText,
          authType: getAuthenticationMethod(error.response)
        }
        window.mapcache.setSourceError({ id: this.id, error: this.error })
      } else if (error.request) {
        if (navigator.onLine) {
          this.error = {
            status: -1,
            statusText: 'Unable to reach server.'
          }
          window.mapcache.setSourceError({ id: this.id, error: this.error })
        } else {
          // notify there may be a network error
          EventBus.$emit(EventBus.EventTypes.NETWORK_ERROR)
        }
      }
    },
    /**
     * Loads the dataUrl into the image.
     * @param dataUrl
     * @param coords
     * @param tile
     * @param resolve
     * @param reject
     */
    loadImage (dataUrl, coords, tile, resolve, reject) {
      tile.onload = () => {
        resolve()
      }
      tile.onerror = (e) => {
        reject(e)
      }
      tile.src = dataUrl
    },
    async compileTiles (id, tiles, size, clippingRegion, targetSrs, targetBounds) {
      return new Promise((resolve, reject) => {
        const request = {
          id,
          tiles,
          size,
          clippingRegion,
          targetSrs,
          targetBounds
        }
        window.mapcache.requestTileCompilation(request).then(result => {
          resolve(result.base64Image)
        }).catch(e => {
          reject(e)
        })
      })
    },
    dataUrlValid (dataUrl) {
      return !isNil(dataUrl) && dataUrl.startsWith('data:image')
    },
    _internalCreateTile (requestId, tile, coords, abortSignal) {
      const cancellableTileRequests = []
      const ret = {
        cancelled: false,
        compileRequestSent: false
      }
      ret.signal = new Promise((resolve, reject) => {
        abortSignal.addEventListener('abort', () => {
          ret.cancelled = true
          if (ret.compileRequestSent) {
            window.mapcache.cancelTileCompilationRequest(requestId)
          }
          cancellableTileRequests.forEach(tileRequest => {
            tileRequest.cancel()
          })
          reject('Cancelled.')
        })
        // if this source is errored, do not allow tile requests
        if (this.hasError()) {
          resolve(null)
        } else {
          const size = this.getTileSize()
          // get web mercator bounding box
          const boundingBox = this.crs === WEB_MERCATOR ? window.mapcache.getWebMercatorBoundingBoxFromXYZ(coords.x, coords.y, coords.z) : getWGS84BoundingBoxFromXYZ(coords.x, coords.y, coords.z)
          // get tile requests
          let requests = this.layer.getTileRequestData(boundingBox, coords, size, this.crs, (bbox, srs) => {
            let projectedBoundingBox
            if (srs === this.crs) {
              projectedBoundingBox = bbox
            } else {
              projectedBoundingBox = window.mapcache.reprojectBoundingBox(bbox.minLon, bbox.maxLon, bbox.minLat, bbox.maxLat, this.crs, srs)
            }
            return projectedBoundingBox
          })

          // create promises for each tile request
          if (requests != null && requests.length > 0) {
            // iterate over each web request and attempt to perform
            const promises = []
            requests.forEach(request => {
              promises.push(new Promise(resolve => {
                if (!ret.cancelled) {
                  const cancellableTileRequest = new CancellableTileRequest()
                  cancellableTileRequests.push(cancellableTileRequest)
                  this.serverMonitor.beforeRender(this.layer)
                  cancellableTileRequest.requestTile(this.axiosRequestScheduler, request.url, this.retryAttempts, this.timeout, this.layer.withCredentials, size).then(({                                                                                                                                                     dataUrl,
                                                                                                                                                                          error
                                                                                                                                                                        }) => {
                    this.serverMonitor.afterRender(this.layer)
                    resolve({ dataUrl, error, request })
                  })
                } else {
                  resolve()
                }
              }))
            })
            Promise.allSettled(promises).then(results => {
              if (!ret.cancelled) {
                const tiles = []
                // handle results
                results.forEach(result => {
                  if (result.status === 'fulfilled') {
                    const { dataUrl, error, request } = result.value
                    if (!error && this.dataUrlValid(dataUrl)) {
                      request.dataUrl = dataUrl
                      tiles.push(request)
                    }
                  }
                })
                if (tiles.length > 0 && !ret.cancelled) {
                  ret.compileRequestSent = true
                  const clippingRegion = getClippingRegion(boundingBox, this.layerBounds)
                  this.compileTiles(requestId, tiles, size, clippingRegion, this.crs, boundingBox).then(dataUrl => {
                    this.loadImage(dataUrl, coords, tile, resolve, reject)
                  })
                } else {
                  reject(new Error('No data retrieved.'))
                }
              }
            })
          } else {
            reject(new Error('No layers.'))
          }
        }
      });
      return ret
    },
    /**
     * Creates the tile for the given xyz coordinates
     * @param coords
     * @param done
     * @return {HTMLImageElement}
     */
    createTile (coords, done) {
      // create the tile img
      const requestId = window.mapcache.createUniqueID()
      const tile = document.createElement('img')
      tile.requestId = requestId
      tile.alt = ''
      tile.setAttribute('role', 'presentation')

      const doneWrapper = (e, t) => {
        if (this.outstandingTileRequests[requestId] && !this.outstandingTileRequests[requestId].cancelled) {
          done(e, t)
        }
        delete this.outstandingTileRequests[requestId]
      }
      const abortController = new AbortController()
      const createTilePromise = this._internalCreateTile(requestId, tile, coords, abortController.signal)
      this.outstandingTileRequests[requestId] = {
        done: doneWrapper,
        cancelled: false,
        cancel: () => {
          try {
            this.outstandingTileRequests[requestId].cancelled = true
            abortController.abort()
            // eslint-disable-next-line no-empty, no-unused-vars
          } catch (e) {
          }
        }
      }
      createTilePromise.signal.then(() => {
        let status = {}
        this.serverMonitor.applyWarningMessage(status)
        if(status.warning) {
          window.mapcache.setSourceWarning({ id: this.id, warning: status.warning })
        }
        doneWrapper(null, tile)
      }).catch((e) => {
        doneWrapper(e, tile)
      })
      return tile
    },
    update: function (layer) {
      const rateLimitChanged = layer.rateLimit !== this.layer.rateLimit
      const timeoutChanged = layer.timeoutMs !== this.layer.timeoutMs
      const retryChanged = layer.retryAttempts !== this.layer.retryAttempts
      const minZoomChanged = layer.minZoom !== this.layer.minZoom
      const maxZoomChanged = layer.maxZoom !== this.layer.maxZoom
      if (rateLimitChanged && !isNil(layer.rateLimit)) {
        if (!isNil(this.axiosRequestScheduler)) {
          this.axiosRequestScheduler.destroy()
        }
        this.axiosRequestScheduler = getAxiosRequestScheduler(layer.rateLimit || DEFAULT_RATE_LIMIT)
      }
      if (retryChanged && !isNil(layer.retryAttempts)) {
        this.retryAttempts = layer.retryAttempts
      }
      if (timeoutChanged && !isNil(layer.timeoutMs)) {
        this.timeout = layer.timeoutMs
      }
      if (!isNil(this._map) && (minZoomChanged || maxZoomChanged)) {
        this.options.minZoom = layer.minZoom
        this.options.maxZoom = layer.maxZoom
        this._map._removeZoomLimit(this)
        this._map._addZoomLimit(this)
        const currentZoom = Math.floor(this._map.getZoom())

        if (currentZoom < layer.minZoom || currentZoom > layer.maxZoom) {
          this._removeAllTiles()
        } else {
          this.redraw()
        }
      }
      if (this.options.opacity !== layer.opacity) {
        this.setOpacity(!isNil(layer.opacity) ? layer.opacity : 1.0)
      }
      if (isNil(layer.error)) {
        this.error = null
      }
      this.layer.update(layer)
      this.webMercatorLayerBounds = window.mapcache.convertToWebMercator(this.layer.extent)
      let southWest = L.latLng(this.layer.extent[1], this.layer.extent[0])
      let northEast = L.latLng(this.layer.extent[3], this.layer.extent[2])
      this.originalOptions.bounds = L.latLngBounds(southWest, northEast)
      L.setOptions(this, this.originalOptions)
    }
  })
}