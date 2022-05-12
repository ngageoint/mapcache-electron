import L from 'leaflet'
// hack so that leaflet's images work after going through webpack
import marker from './map/markers/marker-icon.png'
import marker2x from './map/markers/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import blankMarker from '../leaflet/map/markers/marker-icon-blank.png'
import blankMarker2x from '../leaflet/map/markers/marker-icon-blank-2x.png'
import LeafletEditable from 'leaflet-editable' // eslint-disable-line no-unused-vars
// import LeafletDraw from 'leaflet-draw' // eslint-disable-line no-unused-vars
// import 'leaflet-draw/dist/leaflet.draw.css'
import isNil from 'lodash/isNil'
import EventBus from '../vue/EventBus'
import { getAxiosRequestScheduler, testServiceConnection } from '../network/ServiceConnectionUtils'
import {
  DEFAULT_RATE_LIMIT,
  DEFAULT_TIMEOUT,
  DEFAULT_RETRY_ATTEMPTS,
  SERVICE_TYPE,
  isTimeoutError,
  TIMEOUT_STATUS,
  getAuthenticationMethod
} from '../network/HttpUtilities'
import { XYZ_SERVER, WMS, WMTS } from '../layer/LayerTypes'
import CancellableTileRequest from '../network/CancellableTileRequest'
import { constructRenderer } from './map/renderer/RendererFactory'
import { getClippingRegion } from '../util/xyz/XYZTileUtilities'
import { setupGARSGrid } from './map/grid/gars/garsLeaflet'
import { setupMGRSGrid } from './map/grid/mgrs/mgrsLeaflet'
import { setupXYZGrid } from './map/grid/xyz/xyz'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import initSmoothWheel from './map/improvements/Leaflet.SmoothWheelZoom'
import tileLayerNoGap from './map/improvements/Leaflet.TileLayer.NoGap'

import { WEB_MERCATOR, WEB_MERCATOR_CODE } from '../projection/ProjectionConstants'

initSmoothWheel(L)
tileLayerNoGap(L)


delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  shadowUrl: markerShadow
})

L.Map.mergeOptions({
  // @section Mousewheel options
  // @option smoothWheelZoom: Boolean|String = true
  // Whether the map can be zoomed by using the mouse wheel. If passed `'center'`,
  // it will zoom to the center of the view regardless of where the mouse was.
  smoothWheelZoom: true,

  // @option smoothWheelZoom: number = 1
  // setting zoom speed
  smoothSensitivity: 1

});

/**
 * The map cache map layer is a wrapper for a MapCache Layer object. This object has functions for handling the rendering of EPSG:3857 tiles
 */
L.TileLayer.MapCacheLayer = L.TileLayer.extend({
  initialize: function (options) {
    L.TileLayer.prototype.initialize.call(this, null, options)
    this.layer = options.layer
    this.id = options.layer.id
    this.maxFeatures = options.maxFeatures
    this.className = options.className || ''
    this.outstandingTileRequests = {}

    const renderer = constructRenderer(this.layer, false)
    if (renderer.updateMaxFeatures != null) {
      renderer.updateMaxFeatures(this.maxFeatures)
    }
    this.layer.setRenderer(renderer)
    const unloadListener = (event) => {
      event.tile.onload = null
      if (event.tile.requestId != null && this.outstandingTileRequests[event.tile.requestId] != null) {
        this.outstandingTileRequests[event.tile.requestId].cancelled = true
        this.outstandingTileRequests[event.tile.requestId].done('Cancelled', event.tile)
        this.layer.cancel(event.tile.requestId)
        delete this.outstandingTileRequests[event.tile.requestId]
      }
    }
    this.on('tileunload', unloadListener)
  },
  createTile: function (coords, done) {
    const requestId = window.mapcache.createUniqueID()
    this.outstandingTileRequests[requestId] = {
      done,
      cancelled: false
    }

    const doneWrapper = (e, t) => {
      if (this.outstandingTileRequests[requestId] && !this.outstandingTileRequests[requestId].cancelled) {
        done(e, t)
      }
      delete this.outstandingTileRequests[requestId]
    }

    const tile = document.createElement('img')
    tile.requestId = requestId
    tile.alt = ''
    tile.setAttribute('role', 'presentation')
    const size = this.getTileSize()
    this.layer.renderTile(requestId, coords, size, (err, base64Image) => {
      if (!isNil(err)) {
        doneWrapper(err, tile)
      } else if (base64Image != null) {
        tile.done = done
        tile.onload = () => {
          doneWrapper(null, tile)
        }
        tile.onerror = (e) => {
          doneWrapper(e, tile)
        }
        tile.src = base64Image
      } else {
        doneWrapper(new Error('no data'), tile)
      }
    })
    return tile
  },
  updateMaxFeatures: function (maxFeatures) {
    if (!isNil(this.layer.updateMaxFeatures)) {
      this.layer.updateMaxFeatures(maxFeatures)
    }
  },
  getLayer () {
    return this.layer
  },
  update: function (layer) {
    this.setOpacity(!isNil(layer.opacity) ? layer.opacity : 1.0)
    this.layer.update(layer)
  }
})

/**
 * The map cache networking map layer is a wrapper for WMS/XYZ and other services
 */
L.TileLayer.MapCacheRemoteLayer = L.TileLayer.extend({
  initialize: function (options) {
    this.originalOptions = options
    L.TileLayer.prototype.initialize.call(this, window.mapcache.getBaseURL(options.layer.filePath), options)
    this.outstandingTileRequests = {}
    this.layer = options.layer
    this.webMercatorLayerBounds = window.mapcache.convertToWebMercator(this.layer.extent)
    this.id = options.layer.id
    this.retryAttempts = !isNil(this.layer.retryAttempts) ? this.layer.retryAttempts : DEFAULT_RETRY_ATTEMPTS
    this.timeout = !isNil(this.layer.timeoutMs) ? this.layer.timeoutMs : DEFAULT_TIMEOUT
    this.error = null
    this.axiosRequestScheduler = getAxiosRequestScheduler(this.layer.rateLimit || DEFAULT_RATE_LIMIT)
    this.layer.setRenderer(constructRenderer(this.layer, false))
    this.on('tileunload', (event) => {
      event.tile.onload = null
      event.tile.src = ''
      if (event.tile.requestId != null && this.outstandingTileRequests[event.tile.requestId] != null) {
        this.outstandingTileRequests[event.tile.requestId].cancel()
        delete this.outstandingTileRequests[event.tile.requestId]
      }
    })
    this.srs = WEB_MERCATOR
  },
  async testConnection (ignoreTimeoutError = true) {
    const options = {
      timeout: this.timeout,
      withCredentials: this.layer.withCredentials
    }
    // TODO: add in test support for WMTS
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
        const webMercatorBoundingBox = window.mapcache.getWebMercatorBoundingBoxFromXYZ(coords.x, coords.y, coords.z)
        // get tile requests
        let requests = this.layer.getTileRequestData(webMercatorBoundingBox, coords, size, (bbox, srs) => {
          let projectedBoundingBox
          if (srs.endsWith(WEB_MERCATOR_CODE)) {
            projectedBoundingBox = bbox
          } else {
            projectedBoundingBox = window.mapcache.reprojectWebMercatorBoundingBox(bbox.minLon, bbox.maxLon, bbox.minLat, bbox.maxLat, srs)
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
                cancellableTileRequest.requestTile(this.axiosRequestScheduler, request.url, this.retryAttempts, this.timeout, this.layer.withCredentials, size).then(({
                                                                                                                                                                        dataUrl,
                                                                                                                                                                        error
                                                                                                                                                                      }) => {
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
                const clippingRegion = getClippingRegion(webMercatorBoundingBox, this.webMercatorLayerBounds)
                this.compileTiles(requestId, tiles, size, clippingRegion, this.srs, webMercatorBoundingBox).then(dataUrl => {
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

setupGARSGrid(L)
setupMGRSGrid(L)
setupXYZGrid(L)

/**
 * Adapted from https://github.com/Leaflet/Leaflet.Icon.Glyph, which was originally written by ivan@sanchezortega.es
 */
L.Icon.MaterialDesignIcon = L.Icon.extend({
  options: {
    iconRetinaUrl: blankMarker2x,
    iconUrl: blankMarker,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
    className: '',
    prefix: 'mdi',
    glyphSvg: null,
    glyphColor: '#FFFFFF',
    glyphSize: 15,
    glyphAnchor: [5, 5]
  },

  createIcon: function () {
    const div = document.createElement('div')
    div.appendChild(this._createGlyph())
    this._setIconStyles(div, 'icon')
    return div
  },

  _createGlyph: function () {
    const options = this.options
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    if (options.glyphSvg != null) {
      svg.setAttribute('width', options.glyphSize + 'px')
      svg.setAttribute('height', options.glyphSize + 'px')
      svg.setAttribute('viewBox', '0 0 24 24')
      svg.style.marginLeft = options.glyphAnchor[0] + 'px'
      svg.style.marginTop = options.glyphAnchor[1] + 'px'
      svg.style.pointerEvents = 'none'
      const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      svgPath.setAttribute('fill', options.glyphColor)
      svgPath.setAttribute('d', options.glyphSvg)
      svg.appendChild(svgPath)
    } else {
      svg.setAttribute('width', '9px')
      svg.setAttribute('height', '9px')
      svg.setAttribute('viewBox', '0 0 9 9')
      svg.style.marginLeft = '8px'
      svg.style.marginTop = '8px'
      svg.style.pointerEvents = 'none'
      const svgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      svgCircle.setAttribute('fill', options.glyphColor)
      svgCircle.setAttribute('cx', '4.5')
      svgCircle.setAttribute('cy', '4.5')
      svgCircle.setAttribute('r', '4.5')
      svg.appendChild(svgCircle)
    }
    return svg
  },

  _setIconStyles: function (div, name) {
    var options = this.options
    var sizeOption = options[name + 'Size']

    if (typeof sizeOption === 'number') {
      sizeOption = [sizeOption, sizeOption]
    }

    var size = L.point(sizeOption),
      anchor = L.point(name === 'shadow' && options.shadowAnchor || options.iconAnchor ||
        size && size.divideBy(2, true))

    div.className = 'leaflet-marker-' + name + ' leaflet-glyph-icon ' + (options.className || '')

    const src = this._getIconUrl(name)
    if (src) {
      div.style.backgroundImage = 'url(' + src + ')'
      div.style.backgroundSize = 'cover'
    }

    if (anchor) {
      div.style.marginLeft = (-anchor.x) + 'px'
      div.style.marginTop = (-anchor.y) + 'px'
    }

    if (size) {
      div.style.width = size.x + 'px'
      div.style.height = size.y + 'px'
    }
  },
})

L.icon.materialDesignIcon = function (options) {
  return new L.Icon.MaterialDesignIcon(options)
}

export * as L from 'leaflet'
