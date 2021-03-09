import L from 'leaflet'

// hack so that leaflet's images work after going through webpack
import marker from 'leaflet/dist/images/marker-icon.png'
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import LeafletEditable from 'leaflet-editable' // eslint-disable-line no-unused-vars
import LeafletDraw from 'leaflet-draw' // eslint-disable-line no-unused-vars
import 'leaflet-draw/dist/leaflet.draw.css'
import _ from 'lodash'
import NetworkConstants from './NetworkConstants'
import ServiceConnectionUtils from './ServiceConnectionUtils'
import ActionUtilities from './ActionUtilities'
import EventBus from '../EventBus'
import CancellableTileRequest from './CancellableTileRequest'
import XYZTileUtilities from './XYZTileUtilities'
import GeoServiceUtilities from './GeoServiceUtilities'
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
  },
  initializeLayer: async function () {
    this.initializationState = L.INIT_STATES.INITIALIZATION_STARTED
    await this.layer.initialize()
    this.initializationState = L.INIT_STATES.INITIALIZATION_COMPLETED
  },
  getInitializationState: function () {
    return this.initializationState
  },
  createTile: function (coords, done) {
    // create a <canvas> element for drawing
    let tile = L.DomUtil.create('canvas', 'leaflet-tile')
    // setup tile width and height according to the options
    let size = this.getTileSize()
    tile.width = size.x
    tile.height = size.y
    try {
      if (this.layer.isInitialized()) {
        this.layer.renderTile(coords, tile, done)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('error', e)
    }
    return tile
  },
  updateMaxFeatures: function (maxFeatures) {
    if (!_.isNil(this.layer.updateMaxFeatures)) {
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
    this.setOpacity(!_.isNil(layer.opacity) ? layer.opacity : 1.0)
    this.layer.update(layer)
  },
  close: function () {
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
    this.isPreview = !_.isNil(options.isPreview) ? options.preview : false
    this.retryAttempts = !_.isNil(this.layer.retryAttempts) ? this.layer.retryAttempts : NetworkConstants.DEFAULT_RETRY_ATTEMPTS
    this.timeout = !_.isNil(this.layer.timeoutMs) ? this.layer.timeoutMs : NetworkConstants.DEFAULT_TIMEOUT
    this.error = null
    this.axiosRequestScheduler = ServiceConnectionUtils.getAxiosRequestScheduler(this.layer.rateLimit || NetworkConstants.DEFAULT_RATE_LIMIT)
  },
  initializeLayer: async function () {
    this.initializationState = L.INIT_STATES.INITIALIZATION_STARTED
    await this.layer.initialize()
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
  setError (error) {
    if (error.status === ServiceConnectionUtils.TIMEOUT_STATUS) {
      this.error = error
      ActionUtilities.setSourceError({id: this.id, error: this.error})
    } else if (error.response && (error.response.status >= 500 || error.response.status === 401)) {
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
    if (!this.hasError()) {
      const cancellableTileRequest = new CancellableTileRequest()
      const unloadListener = (event) => {
        if (coords.z === event.coords.z && coords.x === event.coords.x && coords.y === event.coords.y) {
          cancellableTileRequest.cancel()
        }
      }
      this.on('tileunload', unloadListener)
      cancellableTileRequest.requestTile(this.axiosRequestScheduler, this.layer.getTileUrl(coords), this.retryAttempts, this.timeout).then(({dataUrl, error}) => {
        if (!_.isNil(error) && !this.isPreview) {
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
  styleChanged: function () {
  },
  update: function (layer) {
    const rateLimitChanged = layer.rateLimit !== this.layer.rateLimit
    const timeoutChanged = layer.timeoutMs !== this.layer.timeoutMs
    const retryChanged = layer.retryAttempts !== this.layer.retryAttempts
    if (rateLimitChanged && !_.isNil(layer.rateLimit)) {
      if (!_.isNil(this.axiosRequestScheduler)) {
        this.axiosRequestScheduler.destroy()
      }
      this.axiosRequestScheduler = ServiceConnectionUtils.getAxiosRequestScheduler(layer.rateLimit || NetworkConstants.DEFAULT_RATE_LIMIT)
    }
    if (retryChanged && !_.isNil(layer.retryAttempts)) {
      this.retryAttempts = layer.retryAttempts
    }
    if (timeoutChanged && !_.isNil(layer.timeoutMs)) {
      this.timeout = layer.timeoutMs
    }
    this.setOpacity(!_.isNil(layer.opacity) ? layer.opacity : 1.0)
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
        ActionUtilities.setBoundingBoxFilter({projectId: self.projectId, boundingBoxFilter: [boundingBox.west, boundingBox.south, boundingBox.east, boundingBox.north]})
        ActionUtilities.setBoundingBoxFilterEditingDisabled({projectId: self.projectId})
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
