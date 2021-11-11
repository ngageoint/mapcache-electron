import {
  convertCRSToEPSGCode,
  getBoundingBoxFromIndices,
  getTileIndices,
  getTileRequestURL,
} from '../../util/wmts/WMTSUtilities'
import NetworkTileLayer from './NetworkTileLayer'
import { WMTS } from '../LayerTypes'
import { extentIntersection } from '../../util/tile/TileUtilities'

export default class WMTSLayer extends NetworkTileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.layer = configuration.layer
    this.tileMatrixSet = configuration.tileMatrixSet
    this.srs = convertCRSToEPSGCode(this.tileMatrixSet.supportedCRS)
    this.requiresReprojection = !this.tileMatrixSet.supportedCRS.endsWith(':3857')
    this.url = this.filePath
    if (this.layer.resource && this.layer.resource.template) {
      this.url = this.layer.resource.template
    }
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layer: this.layer,
        tileMatrixSet: this.tileMatrixSet,
        layerType: WMTS
      }
    }
  }

  update (configuration) {
    super.update(configuration)
  }

  /**
   * Gets the WMTS pixel span for web mercator
   * @param zoom
   * @param size
   * @param units
   * @return {number}
   */
  getWebMercatorPixelSpan (zoom, size, units = 'degrees') {
    const pixelSpanInMeters = (559082263.9508929 / Math.pow(2, zoom)) * 0.00028
    return units === 'degrees' ? pixelSpanInMeters / size / 360.0 : pixelSpanInMeters
  }

  /**
   * Returns a request object containing a list of network requests to make
   * @param webMercatorBoundingBox
   * @param coords
   * @param size
   * @param projectedBoundingBox
   * @return {{responseType: *, webMercatorBoundingBox: *, srs: string, bbox, webRequests: *[]}}
   */
  getTileRequestData (webMercatorBoundingBox, coords, size, projectedBoundingBox) {
    let request
    const srs = this.tileMatrixSet.supportedCRS
    const tileMatrixSet = this.tileMatrixSet
    // need to check desired resolution in a couple way due to potential configuration differences
    const desiredResolutionMeters = this.getWebMercatorPixelSpan(coords.z, Math.max(size.x, size.y), 'meters')
    const desiredResolutionDegrees = this.getWebMercatorPixelSpan(coords.z, Math.max(size.x, size.y), 'degrees')

    // determine tile matrices that have coverage for the request
    const tileMatricesWithCoverage = tileMatrixSet.tileMatrix.filter(({tileMatrixMinX, tileMatrixMinY, tileMatrixMaxX, tileMatrixMaxY}) => {
      // check if this tile matrix contains the request extent
      return extentIntersection([tileMatrixMinX, tileMatrixMinY, tileMatrixMaxX, tileMatrixMaxY], [projectedBoundingBox.minLon, projectedBoundingBox.minLat, projectedBoundingBox.maxLon, projectedBoundingBox.maxLat]) != null
    })

    // determine tile matrix with closest resolution (will be the best image for projection (if needed))
    let closestResolutionTileMatrix = null
    let closestResolutionDifference = null

    // find the tile matrix with the closest resolution
    tileMatricesWithCoverage.forEach((tileMatrix) => {
      const {
        tileMinCol,
        tileMaxCol,
        tileMinRow,
        tileMaxRow
      } = getTileIndices(tileMatrix, projectedBoundingBox)
      const width = tileMaxCol - tileMinCol + 1
      const height = Math.abs(tileMaxRow - tileMinRow) + 1
      const resolutionDifference = Math.min(Math.abs(desiredResolutionMeters - tileMatrix.pixelSpan), Math.abs(desiredResolutionDegrees - tileMatrix.pixelSpan))
      if (closestResolutionTileMatrix == null) {
        closestResolutionTileMatrix = tileMatrix
        closestResolutionDifference = resolutionDifference
      }
      if (width <= 4 && height <= 4 && resolutionDifference < closestResolutionDifference) {
        closestResolutionTileMatrix = tileMatrix
        closestResolutionDifference = resolutionDifference
      }
    })

    request = {
      bbox: projectedBoundingBox,
      srs: srs,
      responseType: this.layer.resource ? this.layer.resource.format : this.layer.format,
      webRequests: []
    }

    // now determine the tiles we need to request
    if (closestResolutionTileMatrix != null) {
      const {
        tileWidth,
        tileHeight,
      } = closestResolutionTileMatrix

      request.tileWidth = tileWidth
      request.tileHeight = tileHeight

      let {
        tileMinCol,
        tileMaxCol,
        tileMinRow,
        tileMaxRow
      } = getTileIndices(closestResolutionTileMatrix, projectedBoundingBox)

      const layerTileMatrixSet = this.layer.tileMatrixSets.find(set => set.identifier === tileMatrixSet.identifier)
      if (layerTileMatrixSet != null && layerTileMatrixSet.limits) {
        const limits = layerTileMatrixSet.limits[closestResolutionTileMatrix.identifier]
        if (limits != null) {
          tileMinCol = Math.max(tileMinCol, limits.minTileCol)
          tileMinRow = Math.max(tileMinRow, limits.minTileRow)
          tileMaxCol = Math.min(tileMaxCol, limits.maxTileCol)
          tileMaxRow = Math.min(tileMaxRow, limits.maxTileRow)
        }
      }

      for (let x = tileMinCol; x <= tileMaxCol; x++) {
        for (let y = tileMaxRow; y >= tileMinRow; y--) {
          const tileBounds = getBoundingBoxFromIndices(closestResolutionTileMatrix, y, x)
          request.webRequests.push({
            url: encodeURI(getTileRequestURL(this.url, this.layer.identifier, this.layer.format, tileMatrixSet.identifier, closestResolutionTileMatrix.identifier, y, x, this.layer.style)),
            tileBounds: tileBounds,
            width: tileWidth,
            height: tileHeight
          })
        }
      }
    }

    return request
  }
}
