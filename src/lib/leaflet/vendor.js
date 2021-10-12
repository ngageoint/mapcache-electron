import L from 'leaflet'
// hack so that leaflet's images work after going through webpack
import marker from './map/markers/marker-icon.png'
import marker2x from './map/markers/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import blankMarker from '../leaflet/map/markers/marker-icon-blank.png'
import blankMarker2x from '../leaflet/map/markers/marker-icon-blank-2x.png'
import LeafletEditable from 'leaflet-editable' // eslint-disable-line no-unused-vars
import LeafletDraw from 'leaflet-draw' // eslint-disable-line no-unused-vars
import 'leaflet-draw/dist/leaflet.draw.css'
import isNil from 'lodash/isNil'
import EventBus from '../vue/EventBus'
import { getAxiosRequestScheduler, testServiceConnection } from '../network/ServiceConnectionUtils'
import { DEFAULT_RATE_LIMIT, DEFAULT_TIMEOUT, DEFAULT_RETRY_ATTEMPTS, SERVICE_TYPE, isTimeoutError, TIMEOUT_STATUS, getAuthenticationMethod } from '../network/HttpUtilities'
import { XYZ_SERVER, WMS } from '../layer/LayerTypes'
import CancellableTileRequest from '../network/CancellableTileRequest'
import { constructRenderer } from './map/renderer/RendererFactory'
import { getIntersection } from '../util/xyz/XYZTileUtilities'

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
    const renderer = constructRenderer(this.layer, false)
    if (renderer.updateMaxFeatures != null) {
      renderer.updateMaxFeatures(this.maxFeatures)
    }
    this.layer.setRenderer(renderer)
    const unloadListener = (event) => {
      event.tile.onload = null
      event.tile.src = ''
      if (!isNil(event.tile.requestId)) {
        this.layer.cancel(event.tile.requestId)
      }
    }
    this.on('tileunload', unloadListener)
  },
  createTile: function (coords, done) {
    const requestId = window.mapcache.createUniqueID()
    const tile = document.createElement('img')
    tile.requestId = requestId
    tile.alt = ''
    tile.setAttribute('role', 'presentation')
    this.layer.renderTile(requestId, coords, (err, base64Image) => {
      if (!isNil(err)) {
        done(err, tile)
      } else if (base64Image != null) {
        tile.onload = () => {
          done(null, tile)
        }
        tile.onerror = (e) => {
          done(e, tile)
        }
        tile.src = base64Image
      } else {
        done(new Error('no data'), tile)
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
    L.TileLayer.prototype.initialize.call(this, window.mapcache.getBaseURL(options.layer.filePath), options)
    this.activeTileRequests = {}
    this.layer = options.layer
    this.id = options.layer.id
    this.isPreview = !isNil(options.isPreview) ? options.preview : false
    this.retryAttempts = !isNil(this.layer.retryAttempts) ? this.layer.retryAttempts : DEFAULT_RETRY_ATTEMPTS
    this.timeout = !isNil(this.layer.timeoutMs) ? this.layer.timeoutMs : DEFAULT_TIMEOUT
    this.error = null
    this.axiosRequestScheduler = getAxiosRequestScheduler(this.layer.rateLimit || DEFAULT_RATE_LIMIT)
    this.layer.setRenderer(constructRenderer(this.layer, false))
    this.requiresReprojection = !isNil(this.layer.srs) && !this.layer.srs.endsWith(':3857')
    this.on('tileunload', (event) => {
      event.tile.onload = null
      event.tile.src = ''
      if (!isNil(event.tile.requestId)) {
        const tileRequest = this.activeTileRequests[event.tile.requestId]
        if (!isNil(tileRequest)) {
          tileRequest.cancel()
        }
        delete this.activeTileRequests[event.tile.requestId]
        if (this.requiresReprojection) {
          window.mapcache.cancelTileReprojectionRequest(event.tile.requestId)
        }
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
  getLayer () {
    return this.layer
  },
  hasError () {
    return this.error != null
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
  /**
   * Applies the clipping region to the canvas context, prior to drawing the image
   * @param ctx
   * @param clippingRegion
   */
  clipContextToExtent (ctx, clippingRegion) {
    const {
      intersection,
      tileBounds,
      tileHeight,
      tileWidth
    } = clippingRegion

    const getX = (lng, mathFunc) => {
      return mathFunc(256.0 / tileWidth * (lng - tileBounds.minLongitude))
    }
    const getY = (lat, mathFunc) => {
      return mathFunc(256.0 / tileHeight * (tileBounds.maxLatitude - lat))
    }
    const minX = Math.max(0, getX(intersection.minLongitude, Math.floor) - 1)
    const maxX = Math.min(256, getX(intersection.maxLongitude, Math.ceil) + 1)
    const minY = Math.max(0, getY(intersection.maxLatitude, Math.ceil) - 1)
    const maxY = Math.min(256, getY(intersection.minLatitude, Math.floor) + 1)
    ctx.beginPath()
    ctx.rect(minX, minY, maxX - minX, maxY - minY)
    ctx.clip()
  },
  /**
   * Determines the layer's clipping region
   * @param coords
   * @return {{intersection: (null|{maxLongitude: number, minLatitude: number, minLongitude: number, maxLatitude: number}), tileWidth: number, tileBounds: {maxLongitude, minLatitude, minLongitude, maxLatitude}, tileHeight: number}}
   */
  getClippingRegion (coords) {
    const bounds = this._tileCoordsToBounds(coords)
    const tileBounds = {
      minLongitude: bounds._southWest.lng,
      maxLongitude: bounds._northEast.lng,
      minLatitude: bounds._southWest.lat,
      maxLatitude: bounds._northEast.lat,
    }

    const tileWidth = tileBounds.maxLongitude - tileBounds.minLongitude
    const tileHeight = tileBounds.maxLatitude - tileBounds.minLatitude

    let layerBounds = {
      minLongitude: this.layer.extent[0],
      maxLongitude: this.layer.extent[2],
      minLatitude: this.layer.extent[1],
      maxLatitude: this.layer.extent[3],
    }

    // clips tile so that only the intersection of the tile and the user specified bounds are drawn
    return {
      intersection: getIntersection(tileBounds, layerBounds),
      tileBounds,
      tileWidth,
      tileHeight
    }
  },
  /**
   * Clips an image if the tile is not fully enclosed in the layer's bounds
   * @param dataUrl
   * @param coords
   * @return {Promise<unknown>}
   */
  clipImage (dataUrl, coords) {
    return new Promise ((resolve, reject) => {
      const clippingRegion = this.getClippingRegion(coords)
      if (clippingRegion.intersection != null) {
        const image = new Image()
        const canvas = document.createElement('canvas')
        const size = this.getTileSize()
        canvas.width = size.x
        canvas.height = size.y
        image.onload = () => {
          const ctx = canvas.getContext('2d')
          ctx.clearRect(0, 0, size.x, size.y)
          this.clipContextToExtent(ctx, clippingRegion)
          ctx.drawImage(image, 0, 0)
          resolve(canvas.toDataURL())
        }
        image.onerror = (e) => {
          reject(e)
        }
        image.src = dataUrl
      } else {
        resolve(dataUrl)
      }
    })
  },
  /**
   * Loads the dataUrl into the image.
   * @param dataUrl
   * @param coords
   * @param tile
   * @param done
   */
  loadImage (dataUrl, coords, tile, done) {
    tile.onload = () => {
      done(null, tile)
    }
    tile.onerror = (e) => {
      done(e, tile)
    }
    tile.src = dataUrl
  },
  /**
   * Handles reprojecting the tile into 3857,
   * @param requestId
   * @param dataUrl
   * @param bbox
   * @param srs
   * @param size
   * @param webMercatorBoundingBox
   * @return {Promise<unknown>}
   */
  async reprojectTile (requestId, dataUrl, bbox, srs, size, webMercatorBoundingBox) {
    return new Promise((resolve, reject) => {
      if (this.requiresReprojection) {
        window.mapcache.requestTileReprojection({
          id: requestId,
          sourceTile: dataUrl,
          sourceBoundingBox: bbox,
          sourceSrs: srs,
          targetSrs: 'EPSG:3857',
          targetWidth: size.x,
          targetHeight: size.y,
          targetBoundingBox: webMercatorBoundingBox
        }).then(result => {
          resolve(result.base64Image)
        }).catch(e => {
          reject(e)
        })
      } else {
        resolve(dataUrl)
      }
    })
  },
  createTile (coords, done) {
    // create the tile img
    const requestId = window.mapcache.createUniqueID()
    const tile = document.createElement('img')
    tile.requestId = requestId
    tile.alt = ''
    tile.setAttribute('role', 'presentation')

    // if this source is errored, do not allow tile requests
    if (this.hasError()) {
      done(null, null)
    } else {
      const size = this.getTileSize()
      const cancellableTileRequest = new CancellableTileRequest()
      this.activeTileRequests[requestId] = cancellableTileRequest
      // get tile request data
      const { url, bbox, srs, webMercatorBoundingBox } = this.layer.getTileRequestData(coords)
      cancellableTileRequest.requestTile(this.axiosRequestScheduler, url, this.retryAttempts, this.timeout, this.layer.withCredentials).then(({dataUrl, error}) => {
        if (!isNil(error) && !this.isPreview) {
          this.setError(error)
          done(error, tile)
        } else if (!isNil(dataUrl) && !dataUrl.startsWith('data:text/html')) {
          this.reprojectTile(requestId, dataUrl, bbox, srs, size, webMercatorBoundingBox).then(reprojectedImage => {
            this.clipImage(reprojectedImage, coords).then(clippedImage => {
              this.loadImage(clippedImage, coords, tile, done)
            }).catch(e => {
              done(e, tile)
            })
          }).catch(e => {
            done(e, tile)
          })
        } else {
          done(new Error('no data'), tile)
        }
      }).catch(e => {
        done(e, tile, done)
      }).finally(() => {
        delete this.activeTileRequests[requestId]
      })
    }
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
      const currentZoom = this._map.getZoom()

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
  }
})

L.GridLayer.TileSelectionLayer = L.GridLayer.extend({
  initialize: function (options) {
    L.GridLayer.prototype.initialize.call(this, options)
    this.currentId = options.id
  },
  createTile: function (coords) {
    const self = this
    // create a <canvas> element for drawing
    const tile = L.DomUtil.create('button', 'leaflet-tile')

    tile.style.pointerEvents = 'initial'
    tile.style.background = '#4e9cca20'
    tile.style.border = '1px solid #4e9cca'

    L.DomEvent.on(tile, 'mouseover', function () {
      tile.style.background = '#4e9cca66'
    })
    L.DomEvent.on(tile, 'mouseout', function () {
      tile.style.background = '#4e9cca20'
    })
    L.DomEvent.on(tile, 'click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      const tileBounds = self._tileCoordsToBounds(coords)
      if (self.currentId != null) {
        EventBus.$emit(EventBus.EventTypes.BOUNDING_BOX_UPDATED(self.currentId), [tileBounds._southWest.lng, tileBounds._southWest.lat, tileBounds._northEast.lng, tileBounds._northEast.lat])
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

/**
 * Adapted from https://github.com/Leaflet/Leaflet.Icon.Glyph, which was originally written by ivan@sanchezortega.es
 */
L.Icon.MaterialDesignIcon = L.Icon.extend({
  options: {
    iconRetinaUrl: blankMarker2x,
    iconUrl: blankMarker,
    shadowUrl: markerShadow,
    iconSize:    [25, 41],
    iconAnchor:  [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize:  [41, 41],
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

  _createGlyph: function() {
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
      div.style.marginTop  = (-anchor.y) + 'px'
    }

    if (size) {
      div.style.width  = size.x + 'px'
      div.style.height = size.y + 'px'
    }
  },
})

L.icon.materialDesignIcon = function (options) {
  return new L.Icon.MaterialDesignIcon(options)
}

export * as L from 'leaflet'
