import isNil from 'lodash/isNil'
import { getAxiosRequestScheduler } from '../../../network/ServiceConnectionUtils'
import CancellableTileRequest from '../../../network/CancellableTileRequest'
import NetworkTileRenderer from './NetworkTileRenderer'
import { clipImage, stitchTileData } from '../../../util/tile/TileUtilities'
import { createCanvas, disposeCanvas } from '../../../util/canvas/CanvasUtilities'
import { getIntersection } from '../../../util/xyz/XYZTileUtilities'
import { REQUEST_REPROJECT_TILE, REQUEST_REPROJECT_TILE_COMPLETED } from '../../../electron/ipc/MapCacheIPC'

/**
 * Handles the rendering of a WMS layer, this can only be used in a browser context with the mapcache API exposed.
 */
export default class WMTSRenderer extends NetworkTileRenderer {
  requiresReprojection
  createUniqueID
  getWebMercatorBoundingBoxFromXYZ
  convertToWebMercator
  tileIntersectsXYZ
  reprojectWebMercatorBoundingBox
  ipcRenderer

  constructor (layer, isElectron) {
    super(layer)
    this.axiosRequestScheduler = getAxiosRequestScheduler(this.layer.rateLimit)
    this.requiresReprojection = !layer.srs.endsWith(':3857')
    this.isElectron = isElectron
    if (isElectron) {
      this.createUniqueID = require('../../../util/UniqueIDUtilities').createUniqueID
      const { getWebMercatorBoundingBoxFromXYZ, tileIntersectsXYZ } = require('../../../util/tile/TileBoundingBoxUtils')
      this.getWebMercatorBoundingBoxFromXYZ = getWebMercatorBoundingBoxFromXYZ
      this.tileIntersectsXYZ = tileIntersectsXYZ
      const { reprojectWebMercatorBoundingBox, convertToWebMercator } = require('../../../projection/ProjectionUtilities')
      this.reprojectWebMercatorBoundingBox = reprojectWebMercatorBoundingBox
      this.convertToWebMercator = convertToWebMercator
      this.ipcRenderer = require('electron').ipcRenderer
    } else {
      this.createUniqueID = window.mapcache.createUniqueID
      this.getWebMercatorBoundingBoxFromXYZ = window.mapcache.getWebMercatorBoundingBoxFromXYZ
      this.tileIntersectsXYZ = window.mapcache.tileIntersectsXYZ
      this.reprojectWebMercatorBoundingBox = window.mapcache.reprojectWebMercatorBoundingBox
      this.convertToWebMercator = window.mapcache.convertToWebMercator
    }
    this.webMercatorLayerBounds = this.convertToWebMercator(this.layer.extent)

  }

  /**
   * Determines the layer's clipping region
   * @param coords
   * @param webMercatorBoundingBox
   * @return {{intersection: (null|{maxLongitude: number, minLatitude: number, minLongitude: number, maxLatitude: number}), tileWidth: number, tileBounds: {maxLongitude, minLatitude, minLongitude, maxLatitude}, tileHeight: number}}
   */
  getClippingRegion (coords, webMercatorBoundingBox) {
    const tileBounds = {
      minLongitude: webMercatorBoundingBox.minLon,
      maxLongitude: webMercatorBoundingBox.maxLon,
      minLatitude: webMercatorBoundingBox.minLat,
      maxLatitude: webMercatorBoundingBox.maxLat,
    }

    const tileWidth = tileBounds.maxLongitude - tileBounds.minLongitude
    const tileHeight = tileBounds.maxLatitude - tileBounds.minLatitude

    let layerBounds = {
      minLongitude: this.webMercatorLayerBounds.minLon,
      maxLongitude: this.webMercatorLayerBounds.maxLon,
      minLatitude: this.webMercatorLayerBounds.minLat,
      maxLatitude: this.webMercatorLayerBounds.maxLat,
    }

    // clips tile so that only the intersection of the tile and the user specified bounds are drawn
    return {
      intersection: getIntersection(tileBounds, layerBounds),
      tileBounds,
      tileWidth,
      tileHeight
    }
  }

  async reprojectTile (dataUrl, tileBbox, webMercatorBoundingBox, size) {
    return new Promise ((resolve, reject) => {
      const request = {
        id: this.createUniqueID(),
        sourceTile: dataUrl,
        sourceBoundingBox: tileBbox,
        sourceSrs: this.layer.srs,
        targetSrs: 'EPSG:3857',
        targetWidth: size.x,
        targetHeight: size.y,
        targetBoundingBox: webMercatorBoundingBox
      }
      if (this.isElectron) {
        this.ipcRenderer.once(REQUEST_REPROJECT_TILE_COMPLETED(request.id), (event, result) => {
          resolve(result)
        })
        this.ipcRenderer.send(REQUEST_REPROJECT_TILE, request)
      } else {
        window.mapcache.requestTileReprojection(request).then(result => {
          resolve(result)
        }).catch(error => {
          reject (error)
        })
      }
    })
  }

  dataUrlValid (dataUrl) {
    return !isNil(dataUrl) && dataUrl.startsWith('data:image')
  }

  async renderTile (requestId, coords, size, callback) {
    let rendered = false
    if (!isNil(this.error)) {
      callback(this.error, null)
    } else {
      let {x, y, z} = coords
      if (!this.tileIntersectsXYZ(x, y, z, this.layer.extent)) {
        callback(null, null)
        return
      }
      try {
        const webMercatorBoundingBox = this.getWebMercatorBoundingBoxFromXYZ(x, y, z)
        let projectedBoundingBox
        if (this.requiresReprojection) {
          projectedBoundingBox = this.reprojectWebMercatorBoundingBox(webMercatorBoundingBox.minLon, webMercatorBoundingBox.maxLon, webMercatorBoundingBox.minLat, webMercatorBoundingBox.maxLat, this.layer.srs)
        } else {
          projectedBoundingBox = webMercatorBoundingBox
        }
        let requestData = this.layer.getTileRequestData(webMercatorBoundingBox, coords, size, projectedBoundingBox)
        if (requestData != null && requestData.webRequests.length > 0) {
          // iterate over each web request and attempt to perform
          const promises = []
          const tiles = []
          requestData.webRequests.forEach(request => {
            promises.push(new Promise(resolve => {
              const cancellableTileRequest = new CancellableTileRequest(this.isElectron)
              cancellableTileRequest.requestTile(this.axiosRequestScheduler, request.url, this.retryAttempts, this.timeout, this.layer.withCredentials, size).then(({dataUrl, error}) => {
                if (!error && this.dataUrlValid(dataUrl)) {
                  tiles.push({
                    bounds: request.tileBounds,
                    width: request.width,
                    height: request.height,
                    dataUrl: dataUrl
                  })
                }
                resolve()
              })
            }))
          })
          await Promise.allSettled(promises)
          if (tiles.length > 0) {
            const canvas = createCanvas(size.x, size.y)
            let dataUrl = await stitchTileData(canvas, tiles, size, projectedBoundingBox)
            if (this.dataUrlValid(dataUrl)) {
              if (this.requiresReprojection) {
                dataUrl = (await this.reprojectTile(dataUrl, projectedBoundingBox, webMercatorBoundingBox, size)).base64Image
              }
              dataUrl = await clipImage(canvas, dataUrl, this.getClippingRegion(coords, webMercatorBoundingBox), size)
              disposeCanvas(canvas)
              rendered = true
              callback(null, dataUrl)
            }
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
