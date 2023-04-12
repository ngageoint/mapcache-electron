import isNil from 'lodash/isNil'
import { constructRenderer } from '../renderer/RendererFactory.js'
import { GEOPACKAGE } from '../../../layer/LayerTypes.js'

/**
 * The map cache map layer is a wrapper for a MapCache Layer object. This object has functions for handling the rendering of EPSG:3857 tiles
 */
export default function (L) {
  L.TileLayer.MapCacheLayer = L.TileLayer.extend({
    initialize: function (options) {
      if (options.layer && options.layer.layerType === GEOPACKAGE) {
        options.removeZooms = true
      }
      L.TileLayer.prototype.initialize.call(this, null, options)
      this.layer = options.layer
      this.id = options.layer.id
      this.maxFeatures = options.maxFeatures
      this.className = options.className || ''
      this.outstandingTileRequests = {}
      this.crs = options.crs ? options.crs.code : L.CRS.EPSG3857.code


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
      this.layer.renderTile(requestId, coords, size, this.crs, (err, base64Image) => {
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
}