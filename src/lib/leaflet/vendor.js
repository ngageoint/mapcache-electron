import L from 'leaflet'
// hack so that leaflet's images work after going through webpack
import marker from 'leaflet/dist/images/marker-icon.png'
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import LeafletEditable from 'leaflet-editable' // eslint-disable-line no-unused-vars
import LeafletDraw from 'leaflet-draw' // eslint-disable-line no-unused-vars
import 'leaflet-draw/dist/leaflet.draw.css'
import isNil from 'lodash/isNil'
import EventBus from '../vue/EventBus'
import { getAxiosRequestScheduler, testServiceConnection } from '../network/ServiceConnectionUtils'
import { DEFAULT_RATE_LIMIT, DEFAULT_TIMEOUT, DEFAULT_RETRY_ATTEMPTS, SERVICE_TYPE, isTimeoutError, TIMEOUT_STATUS, getAuthenticationMethod } from '../network/HttpUtilities'
import { XYZ_SERVER, WMS } from '../layer/LayerTypes'
import { tileBboxCalculator } from '../util/XYZTileUtilities'
import CancellableTileRequest from '../network/CancellableTileRequest'
import { constructRenderer } from './map/renderer/RendererFactory'

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  shadowUrl: markerShadow
})

/**
 * The map cache map layer is a wrapper for a MapCache Layer object. This object has functions for handling the rendering of EPSG:3857 tiles
 */
L.GridLayer.MapCacheLayer = L.GridLayer.extend({
  initialize: function (options) {
    L.GridLayer.prototype.initialize.call(this, options)
    this.layer = options.layer
    this.id = options.layer.id
    this.maxFeatures = options.maxFeatures
    this.unloadListener = (event) => {
      this.layer.cancel(event.coords)
      let ctx = event.tile.getContext('2d')
      ctx.clearRect(0, 0, event.tile.width, event.tile.height)
    }
    this.on('tileunload', this.unloadListener)
    const renderer = constructRenderer(this.layer, false)
    if (renderer.updateMaxFeatures != null) {
      renderer.updateMaxFeatures(this.maxFeatures)
    }
    this.layer.setRenderer(renderer)
  },
  createTile: function (coords, done) {
    let tile = L.DomUtil.create('canvas', 'leaflet-tile')
    let size = this.getTileSize()
    tile.width = size.x
    tile.height = size.y
    try {
      this.layer.renderTile(coords, (err, base64Image) => {
        if (err) {
          done(err, tile)
        } else if (base64Image != null) {
          let image = new Image()
          image.onload = () => {
            let ctx = tile.getContext('2d')
            ctx.clearRect(0, 0, tile.width, tile.height)
            ctx.drawImage(image, 0, 0)
            done(null, tile)
          }
          image.onerror = (e) => {
            done(e, tile)
          }
          image.src = base64Image
        } else {
          done(new Error('No tile data returned.'), tile)
        }
      })
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to render tile.')
      done(e, tile)
    }
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
  },
  close: function () {
    this.off('tileunload', this.unloadListener)
  }
})

/**
 * The map cache networking map layer is a wrapper for WMS/XYZ and other services
 */
L.TileLayer.MapCacheRemoteLayer = L.TileLayer.extend({
  initialize: function (options) {
    L.TileLayer.prototype.initialize.call(this, window.mapcache.getBaseURL(options.layer.filePath), options)
    this.layer = options.layer
    this.id = options.layer.id
    this.isPreview = !isNil(options.isPreview) ? options.preview : false
    this.retryAttempts = !isNil(this.layer.retryAttempts) ? this.layer.retryAttempts : DEFAULT_RETRY_ATTEMPTS
    this.timeout = !isNil(this.layer.timeoutMs) ? this.layer.timeoutMs : DEFAULT_TIMEOUT
    this.error = null
    this.axiosRequestScheduler = getAxiosRequestScheduler(this.layer.rateLimit || DEFAULT_RATE_LIMIT)
    this.layer.setRenderer(constructRenderer(this.layer, false))
  },
  getLayer () {
    return this.layer
  },
  hasError () {
    return this.error !== null && this.error !== undefined
  },
  async testConnection (ignoreTimeoutError = true) {
    const options = {
      timeout: this.timeout,
      withCredentials: this.layer.withCredentials
    }

    if (this.layer.layerType === XYZ_SERVER) {
      options.subdomains = this.layer.subdomains || []
      let {error} = await testServiceConnection(this.layer.filePath, SERVICE_TYPE.XYZ, options)
      if (!isNil(error) && !isTimeoutError(error) || !ignoreTimeoutError) {
        throw error
      }
    } else if (this.layer.layerType === WMS) {
      options.version = this.layer.version
      let {serviceInfo, error} = await testServiceConnection(this.layer.filePath, SERVICE_TYPE.WMS, options)
      if (!isNil(serviceInfo)) {
        // verify that this source is still valid when compared to the service info
        const layers = this.layer.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) !== -1)
        if (layers.length !== this.layer.layers.length) {
          const missingLayers = this.layer.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) === -1)
          error = {status: 400, statusText: 'The following layer' + (missingLayers.length > 1 ? 's' : '') + ' no longer exist: ' + missingLayers.join(', ')}
        }
      }
      if (!isNil(error) && (!isTimeoutError(error) || !ignoreTimeoutError)) {
        throw error
      }
    }
  },
  setError (error) {
    if (error.status === TIMEOUT_STATUS) {
      this.error = error
      window.mapcache.setSourceError({id: this.id, error: this.error})
    } else if (error.response && (error.response.status >= 500 || error.response.status === 401)) {
      this.error = {
        status: error.response.status,
        statusText: error.response.statusText,
        authType: getAuthenticationMethod(error.response)
      }
      window.mapcache.setSourceError({id: this.id, error: this.error})
    } else if (error.request) {
      if (navigator.onLine) {
        this.error = {
          status: -1,
          statusText: 'Unable to reach server.'
        }
        window.mapcache.setSourceError({id: this.id, error: this.error})
      } else {
        // notify there may be a network error
        EventBus.$emit(EventBus.EventTypes.NETWORK_ERROR)
      }
    }
  },
  createTile (coords, done) {
    let img = document.createElement('img')
    if (!this.hasError()) {
      const cancellableTileRequest = new CancellableTileRequest()
      const unloadListener = (event) => {
        if (coords.z === event.coords.z && coords.x === event.coords.x && coords.y === event.coords.y) {
          cancellableTileRequest.cancel()
        }
      }
      this.on('tileunload', unloadListener)
      cancellableTileRequest.requestTile(this.axiosRequestScheduler, this.layer.getTileUrl(coords), this.retryAttempts, this.timeout, this.layer.withCredentials).then(({dataUrl, error}) => {
        if (!isNil(error) && !this.isPreview) {
          this.setError(error)
        }
        if (!isNil(dataUrl) && !dataUrl.startsWith('data:text/html')) {
          img.src = dataUrl
        } else {
          error = new Error('no data')
        }
        this.off('tileunload', unloadListener)
        done(error, img)
      })
    }
    return img
  },
  update: function (layer) {
    const rateLimitChanged = layer.rateLimit !== this.layer.rateLimit
    const timeoutChanged = layer.timeoutMs !== this.layer.timeoutMs
    const retryChanged = layer.retryAttempts !== this.layer.retryAttempts
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
    this.setOpacity(!isNil(layer.opacity) ? layer.opacity : 1.0)
    if (isNil(layer.error)) {
      this.error = null
    }
    this.layer.update(layer)
  }
})

L.GridLayer.TileSelectionLayer = L.GridLayer.extend({
  initialize: function (options) {
    L.GridLayer.prototype.initialize.call(this, options)
    this.projectId = options.projectId
  },
  createTile: function (coords) {
    const self = this
    // create a <canvas> element for drawing
    const tile = L.DomUtil.create('button', 'leaflet-tile')

    tile.style.pointerEvents = 'initial'
    tile.style.background = '#4e9cca22'
    tile.style.border = '1px solid #4e9cca'

    L.DomEvent.on(tile, 'mouseover', function () {
      tile.style.background = '#4e9cca66'
    })
    L.DomEvent.on(tile, 'mouseout', function () {
      tile.style.background = '#4e9cca22'
    })
    L.DomEvent.on(tile, 'click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      let boundingBox = tileBboxCalculator(coords.x, coords.y, coords.z)
      if (self.projectId !== null && self.projectId !== undefined) {
        window.mapcache.setBoundingBoxFilter({projectId: self.projectId, boundingBoxFilter: [boundingBox.west, boundingBox.south, boundingBox.east, boundingBox.north]})
        window.mapcache.setBoundingBoxFilterEditingDisabled({projectId: self.projectId})
      }
    })
    L.DomEvent.on(tile, 'mousedown', function () {
      tile.style.background = '#4e9cca99'
    })
    L.DomEvent.on(tile, 'mouseup', function () {
      tile.style.background = '#4e9cca66'
    })
    return tile
  }
})

export * as L from 'leaflet'
