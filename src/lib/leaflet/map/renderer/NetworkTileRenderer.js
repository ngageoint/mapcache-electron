import {
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_TIMEOUT,
  DEFAULT_RATE_LIMIT,
  TIMEOUT_STATUS,
  getAuthenticationMethod
} from '../../../network/HttpUtilities'
import EventBus from '../../../vue/EventBus'
import isNil from 'lodash/isNil'
import { getAxiosRequestScheduler } from '../../../network/ServiceConnectionUtils'
import CancellableTileRequest from '../../../network/CancellableTileRequest'
import { getClippingRegion } from '../../../util/xyz/XYZTileUtilities'
import {
  REQUEST_TILE_COMPILATION,
  REQUEST_TILE_COMPILATION_COMPLETED
} from '../../../electron/ipc/MapCacheIPC'
import { WEB_MERCATOR } from '../../../projection/ProjectionConstants'
import { getWGS84BoundingBoxFromXYZ } from '../../../util/xyz/WGS84XYZTileUtilities'

/**
 * This tile layer includes network connection settings such as timeout, retry attempts and number of requests per second (rate limit)
 */
export default class NetworkTileRenderer {
  error
  layer
  requiresReprojection
  createUniqueID
  getWebMercatorBoundingBoxFromXYZ
  convertToWebMercator
  tileIntersectsXYZ
  reprojectWebMercatorBoundingBox
  ipcRenderer

  constructor (layer, isElectron) {
    this.layer = layer
    this.rateLimit = this.layer.rateLimit || DEFAULT_RATE_LIMIT
    this.retryAttempts = !isNil(this.layer.retryAttempts) ? this.layer.retryAttempts : DEFAULT_RETRY_ATTEMPTS
    this.timeoutMs = !isNil(this.layer.timeoutMs) ? this.layer.timeoutMs : DEFAULT_TIMEOUT
    this.axiosRequestScheduler = getAxiosRequestScheduler(this.rateLimit)
    this.isElectron = isElectron
    if (isElectron) {
      this.createUniqueID = require('../../../util/UniqueIDUtilities').createUniqueID
      const { getWebMercatorBoundingBoxFromXYZ, tileIntersectsXYZ } = require('../../../util/tile/TileBoundingBoxUtils')
      this.getWebMercatorBoundingBoxFromXYZ = getWebMercatorBoundingBoxFromXYZ
      this.tileIntersectsXYZ = tileIntersectsXYZ
      const {
        reprojectBoundingBox,
        convertToWebMercator
      } = require('../../../projection/ProjectionUtilities')
      this.reprojectBoundingBox = reprojectBoundingBox
      this.convertToWebMercator = convertToWebMercator
      this.ipcRenderer = require('electron').ipcRenderer
    } else {
      this.createUniqueID = window.mapcache.createUniqueID
      this.getWebMercatorBoundingBoxFromXYZ = window.mapcache.getWebMercatorBoundingBoxFromXYZ
      this.tileIntersectsXYZ = window.mapcache.tileIntersectsXYZ
      this.reprojectBoundingBox = window.mapcache.reprojectBoundingBox
      this.convertToWebMercator = window.mapcache.convertToWebMercator
    }
    this.layerBounds3857 = this.convertToWebMercator(this.layer.extent)
    this.layerBounds4326 = this.layer.extent.slice()
  }

  setLayer (layer) {
    this.layer = layer
  }

  setError (error) {
    if (error.status === TIMEOUT_STATUS) {
      this.error = error
      window.mapcache.setSourceError({ id: this.layer.id, error: this.error })
    } else if (error.response && (error.response.status >= 400)) {
      this.error = {
        status: error.response.status,
        statusText: error.response.statusText,
        authType: getAuthenticationMethod(error.response)
      }
      window.mapcache.setSourceError({ id: this.layer.id, error: this.error })
    } else if (error.request) {
      if (navigator.onLine) {
        this.error = {
          status: -1,
          statusText: 'Unable to reach server.'
        }
        window.mapcache.setSourceError({ id: this.layer.id, error: this.error })
      } else {
        // notify there may be a network error
        EventBus.$emit(EventBus.EventTypes.NETWORK_ERROR)
      }
    }
  }

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
      if (this.isElectron) {
        this.ipcRenderer.once(REQUEST_TILE_COMPILATION_COMPLETED(request.id), (event, result) => {
          resolve(result.base64Image)
        })
        this.ipcRenderer.send(REQUEST_TILE_COMPILATION, request)
      } else {
        window.mapcache.requestTileCompilation(request).then(result => {
          resolve(result.base64Image)
        }).catch(error => {
          reject(error)
        })
      }
    })
  }

  dataUrlValid (dataUrl) {
    return !isNil(dataUrl) && dataUrl.startsWith('data:image')
  }

  /**
   * Handles the rendering of tiles for remote sources. Will rely on those layers to provide the specific tile requests
   * needed to create the requested tile. Then it will compile those tiles to produce the appropriate image.
   * @param requestId
   * @param coords
   * @param size
   * @param crs
   * @param callback
   * @returns {Promise<void>}
   */
  async renderTile (requestId, coords, size, crs, callback) {
    let rendered = false
    const layerBounds = crs === WEB_MERCATOR ? this.layerBounds3857 : this.layerBounds4326
    if (!isNil(this.error)) {
      callback(this.error, null)
    } else {
      try {
        let { x, y, z } = coords
        if (!this.tileIntersectsXYZ(x, y, z, crs, this.layer.extent)) {
          rendered = true
          callback(null, null)
          return
        }
        const boundingBox = crs === WEB_MERCATOR ? this.getWebMercatorBoundingBoxFromXYZ(coords.x, coords.y, coords.z) : getWGS84BoundingBoxFromXYZ(coords.x, coords.y, coords.z)
        // get tile requests
        let requests = this.layer.getTileRequestData(boundingBox, coords, size, crs, (bbox, srs) => {
          let projectedBoundingBox
          if (srs === crs) {
            projectedBoundingBox = bbox
          } else {
            projectedBoundingBox = this.reprojectBoundingBox(bbox.minLon, bbox.maxLon, bbox.minLat, bbox.maxLat, crs, srs)
          }
          return projectedBoundingBox
        })

        if (requests != null && requests.length > 0) {
          // iterate over each web request and attempt to perform
          const promises = []
          requests.forEach(request => {
            promises.push(new Promise(resolve => {
              const cancellableTileRequest = new CancellableTileRequest(this.isElectron)
              cancellableTileRequest.requestTile(this.axiosRequestScheduler, request.url, this.retryAttempts, this.timeoutMs, this.layer.withCredentials, size).then(({
                                                                                                                                                                        dataUrl,
                                                                                                                                                                        error
                                                                                                                                                                      }) => {
                resolve({ dataUrl, error, request })
              })
            }))
          })

          const results = await Promise.allSettled(promises)
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
          if (tiles.length > 0) {
            const dataUrl = await this.compileTiles(requestId, tiles, size, getClippingRegion(boundingBox, layerBounds), crs, boundingBox)
            rendered = true
            callback(null, dataUrl)
          }
        }
      } catch (e) {
        rendered = true
        callback(e, null)
      } finally {
        if (!rendered) {
          callback(null, null)
        }
      }
    }
  }
}
