import L from 'leaflet'

// hack so that leaflet's images work after going through webpack
import marker from 'leaflet/dist/images/marker-icon.png'
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import LeafletEditable from 'leaflet-editable' // eslint-disable-line no-unused-vars
import LeafletDraw from 'leaflet-draw' // eslint-disable-line no-unused-vars
import 'leaflet-draw/dist/leaflet.draw.css'
import isNil from 'lodash/isNil'
import ServiceConnectionUtils from '../network/ServiceConnectionUtils'
import ProjectActions from '../vuex/ProjectActions'
import EventBus from '../vue/EventBus'
import CancellableTileRequest from '../network/CancellableTileRequest'
import XYZTileUtilities from '../util/XYZTileUtilities'
import GeoServiceUtilities from '../util/GeoServiceUtilities'
import LayerTypes from '../source/layer/LayerTypes'
import HttpUtilities from '../network/HttpUtilities'
import RendererFactory from '../source/layer/renderer/RendererFactory'
import ElectronGeoTiffRenderer from '../source/layer/renderer/ElectronGeoTiffRenderer'
import ElectronMBTilesRenderer from '../source/layer/renderer/ElectronMBTilesRenderer'
import ElectronGeoPackageRenderer from '../source/layer/renderer/ElectronGeoPackageRenderer'

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  shadowUrl: markerShadow
})

L.INIT_STATES = {
  INITIALIZATION_NOT_STARTED: 0,
  INITIALIZATION_STARTED: 1,
  INITIALIZATION_COMPLETED: 2
}

/**
 * The map cache map layer is a wrapper for a MapCache Layer object. This object has functions for handling the rendering of EPSG:3857 tiles
 */
L.GridLayer.MapCacheMapLayer = L.GridLayer.extend({
  initialize: function (options) {
    L.GridLayer.prototype.initialize.call(this, options)
    this.layer = options.layer
    this.id = options.layer.id
    this.initializationState = L.INIT_STATES.INITIALIZATION_NOT_STARTED
    this.maxFeatures = options.maxFeatures
    this.unloadListener = (event) => {
      this.layer.cancel(event.coords)
      let ctx = event.tile.getContext('2d')
      ctx.clearRect(0, 0, event.tile.width, event.tile.height)
    }
    this.on('tileunload', this.unloadListener)
  },
  initializeLayer: async function () {
    this.initializationState = L.INIT_STATES.INITIALIZATION_STARTED
    await this.layer.initialize()
    if (this.layer.layerType === LayerTypes.GEOTIFF) {
      this.layer.setRenderer(new ElectronGeoTiffRenderer(this.layer))
    } else if (this.layer.layerType === LayerTypes.MBTILES) {
      this.layer.setRenderer(new ElectronMBTilesRenderer(this.layer))
    } else if (this.layer.layerType === LayerTypes.VECTOR) {
      const renderer = new ElectronGeoPackageRenderer(this.layer)
      renderer.updateMaxFeatures(this.maxFeatures)
      this.layer.setRenderer(renderer)

    } else {
      this.layer.setRenderer(RendererFactory.constructRenderer(this.layer))
    }
    this.initializationState = L.INIT_STATES.INITIALIZATION_COMPLETED
  },
  getInitializationState: function () {
    return this.initializationState
  },
  createTile: function (coords, done) {
    let tile = L.DomUtil.create('canvas', 'leaflet-tile')
    let size = this.getTileSize()
    tile.width = size.x
    tile.height = size.y
    let ctx = tile.getContext('2d')
    ctx.clearRect(0, 0, tile.width, tile.height)
    try {
      if (this.layer.isInitialized()) {
        this.layer.renderTile(coords, (err, base64Image) => {
          if (err) {
            done(err, null)
          } else if (!isNil(base64Image)) {
            let image = new Image()
            image.onload = () => {
              ctx.drawImage(image, 0, 0)
              done(null, base64Image)
            }
            image.src = base64Image
          } else {
            done(null, null)
          }
        })
      }
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to render tile.')
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
  styleChanged: async function () {
    await this.layer.styleChanged()
  },
  update: function (layer) {
    this.setOpacity(!isNil(layer.opacity) ? layer.opacity : 1.0)
    this.layer.update(layer)
  },
  close: function () {
    this.off('tileunload', this.unloadListener)
    this.layer.close()
  }
})

/**
 * The map cache networking map layer is a wrapper for WMS/XYZ and other services
 */
L.TileLayer.MapCacheNetworkingLayer = L.TileLayer.extend({
  initialize: function (options) {
    L.TileLayer.prototype.initialize.call(this, GeoServiceUtilities.getBaseURL(options.layer.filePath), options)
    this.initializationState = L.INIT_STATES.INITIALIZATION_NOT_STARTED
    this.layer = options.layer
    this.id = options.layer.id
    this.isPreview = !isNil(options.isPreview) ? options.preview : false
    this.retryAttempts = !isNil(this.layer.retryAttempts) ? this.layer.retryAttempts : HttpUtilities.DEFAULT_RETRY_ATTEMPTS
    this.timeout = !isNil(this.layer.timeoutMs) ? this.layer.timeoutMs : HttpUtilities.DEFAULT_TIMEOUT
    this.error = null
    this.axiosRequestScheduler = ServiceConnectionUtils.getAxiosRequestScheduler(this.layer.rateLimit || HttpUtilities.DEFAULT_RATE_LIMIT)
  },
  initializeLayer: async function () {
    this.initializationState = L.INIT_STATES.INITIALIZATION_STARTED
    await this.layer.initialize()
    this.layer.setRenderer(RendererFactory.constructRenderer(this.layer))
    this.initializationState = L.INIT_STATES.INITIALIZATION_COMPLETED
  },
  getInitializationState: function () {
    return this.initializationState
  },
  getLayer () {
    return this.layer
  },
  hasError () {
    return this.error !== null && this.error !== undefined
  },
  async testConnection (allowAuth = false, ignoreTimeoutError = true) {
    const options = {
      timeout: this.timeout,
      allowAuth: allowAuth
    }

    if (this.layer.layerType === LayerTypes.XYZ_SERVER) {
      options.subdomains = this.layer.subdomains || []
      let {error} = await ServiceConnectionUtils.testServiceConnection(this.filePath, HttpUtilities.SERVICE_TYPE.XYZ, options)
      if (!isNil(error) && !HttpUtilities.isTimeoutError(error) || !ignoreTimeoutError) {
        throw error
      }
    } else if (this.layer.layerType === LayerTypes.WMS) {
      options.version = this.layer.version
      let {serviceInfo, error} = await ServiceConnectionUtils.testServiceConnection(this.filePath, HttpUtilities.SERVICE_TYPE.WMS, options)
      if (!isNil(serviceInfo)) {
        // verify that this source is still valid when compared to the service info
        const layers = this.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) !== -1)
        if (layers.length !== this.layers.length) {
          const missingLayers = this.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) === -1)
          error = {status: 400, statusText: 'The following layer' + (missingLayers.length > 1 ? 's' : '') + ' no longer exist: ' + missingLayers.join(', ')}
        }
      }
      if (!isNil(error) && (!HttpUtilities.isTimeoutError(error) || !ignoreTimeoutError)) {
        throw error
      }
    }
  },
  setError (error) {
    if (error.status === HttpUtilities.TIMEOUT_STATUS) {
      this.error = error
      ProjectActions.setSourceError({id: this.id, error: this.error})
    } else if (error.response && (error.response.status >= 500 || error.response.status === 401)) {
      this.error = {
        status: error.response.status,
        statusText: error.response.statusText,
        authType: HttpUtilities.getAuthenticationMethod(error.response)
      }
      ProjectActions.setSourceError({id: this.id, error: this.error})
    } else if (error.request) {
      if (navigator.onLine) {
        this.error = {
          status: -1,
          statusText: 'Unable to reach server.'
        }
        ProjectActions.setSourceError({id: this.id, error: this.error})
      } else {
        // notify there may be a network error
        EventBus.$emit(EventBus.EventTypes.NETWORK_ERROR)
      }
    }
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
      cancellableTileRequest.requestTile(this.axiosRequestScheduler, this.layer.getTileUrl(coords), this.retryAttempts, this.timeout).then(({dataUrl, error}) => {
        if (!isNil(error) && !this.isPreview) {
          this.setError(error)
        }
        if (!isNil(dataUrl)) {
          img.src = dataUrl
        }
        this.off('tileunload', unloadListener)
        done(error, img)
      })
    }
    return img
  },
  styleChanged: function () {
  },
  update: function (layer) {
    const rateLimitChanged = layer.rateLimit !== this.layer.rateLimit
    const timeoutChanged = layer.timeoutMs !== this.layer.timeoutMs
    const retryChanged = layer.retryAttempts !== this.layer.retryAttempts
    if (rateLimitChanged && !isNil(layer.rateLimit)) {
      if (!isNil(this.axiosRequestScheduler)) {
        this.axiosRequestScheduler.destroy()
      }
      this.axiosRequestScheduler = ServiceConnectionUtils.getAxiosRequestScheduler(layer.rateLimit || HttpUtilities.DEFAULT_RATE_LIMIT)
    }
    if (retryChanged && !isNil(layer.retryAttempts)) {
      this.retryAttempts = layer.retryAttempts
    }
    if (timeoutChanged && !isNil(layer.timeoutMs)) {
      this.timeout = layer.timeoutMs
    }
    this.setOpacity(!isNil(layer.opacity) ? layer.opacity : 1.0)
    this.layer.update(layer)
  },
  close: function () {
    this.layer.close()
  }
})

L.GridLayer.TileSelectionMapLayer = L.GridLayer.extend({
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
      let boundingBox = XYZTileUtilities.tileBboxCalculator(coords.x, coords.y, coords.z)
      if (self.projectId !== null && self.projectId !== undefined) {
        ProjectActions.setBoundingBoxFilter({projectId: self.projectId, boundingBoxFilter: [boundingBox.west, boundingBox.south, boundingBox.east, boundingBox.north]})
        ProjectActions.setBoundingBoxFilterEditingDisabled({projectId: self.projectId})
      }
    })
    L.DomEvent.on(tile, 'mousedown', function () {
      tile.style.background = '#4e9cca99'
    })
    L.DomEvent.on(tile, 'mouseup', function () {
      tile.style.background = '#4e9cca66'
    })
    return tile
  },
  close: function () {
    this.layer.close()
  }
})

export * as L from 'leaflet'
