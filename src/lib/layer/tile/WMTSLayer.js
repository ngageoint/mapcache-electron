import {
  getBoundingBoxFromIndices, getEPSGCode,
  getRecommendedEpsg,
  getRecommendedSrs,
  getTileIndices,
  getTileRequestURL,
} from '../../util/wmts/WMTSUtilities'
import { WMTS } from '../LayerTypes'
import { extentIntersection } from '../../util/tile/TileUtilities'
import MultiLayerNetworkTileLayer from './MultiLayerNetworkTileLayer'
import { COLON_DELIMITER, WEB_MERCATOR_CODE, WORLD_GEODETIC_SYSTEM_CODE } from '../../projection/ProjectionConstants'

export default class WMTSLayer extends MultiLayerNetworkTileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.layers = configuration.layers
    this.wmtsInfo = configuration.wmtsInfo
    this.url = this.filePath
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layers: this.layers,
        wmtsInfo: this.wmtsInfo,
        layerType: WMTS
      }
    }
  }

  update (configuration) {
    super.update(configuration)
    this.layers = configuration.layers
    this.wmtsInfo = configuration.wmtsInfo
    this.extent = WMTSLayer.getExtentForLayers(configuration.layers)
  }

  static getLayerTileMatrixInfo (wmtsInfo, layer, preferredCrsCode = WEB_MERCATOR_CODE) {
    const supportedTileMatrixSets = wmtsInfo.tileMatrixSet.filter(tms => layer.tileMatrixSets.findIndex(set => set.identifier === tms.identifier) !== -1)
    const supportedTileMatrixSetSrsList = supportedTileMatrixSets.map(tms => tms.supportedCRS)
    const preferredTileMatrixSetSrs = getRecommendedSrs(supportedTileMatrixSetSrsList, preferredCrsCode)
    const tileMatrixSet = supportedTileMatrixSets.find(tms => tms.supportedCRS === preferredTileMatrixSetSrs)
    const srs = getRecommendedEpsg(supportedTileMatrixSetSrsList)
    return { tileMatrixSet, srs }
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
   * @param boundingBox
   * @param coords
   * @param size
   * @param crs
   * @param projectedBoundingBoxFunction
   * @return
   */
  getTileRequestData (boundingBox, coords, size, crs, projectedBoundingBoxFunction) {
    let requests = []

    this.layers.filter(l => l.enabled).reverse().forEach(layer => {
      let url = this.url
      if (layer.resource && layer.resource.template) {
        url = layer.resource.template
      }

      const { tileMatrixSet } = WMTSLayer.getLayerTileMatrixInfo(this.wmtsInfo, layer, getEPSGCode(crs))
      const srs = tileMatrixSet.supportedCRS

      const projectedBoundingBox = projectedBoundingBoxFunction(boundingBox, srs)


      const zoom = srs.endsWith(COLON_DELIMITER + WEB_MERCATOR_CODE) && crs.endsWith(COLON_DELIMITER + WORLD_GEODETIC_SYSTEM_CODE) ? coords.z : Math.min(20, coords.z + 1)
      // need to check desired resolution in a couple way due to potential configuration differences
      const desiredResolutionMeters = this.getWebMercatorPixelSpan(zoom, Math.max(size.x, size.y), 'meters')
      const desiredResolutionDegrees = this.getWebMercatorPixelSpan(zoom, Math.max(size.x, size.y), 'degrees')


      // determine tile matrices that have coverage for the request
      const tileMatricesWithCoverage = tileMatrixSet.tileMatrix.filter(({
                                                                          tileMatrixMinX,
                                                                          tileMatrixMinY,
                                                                          tileMatrixMaxX,
                                                                          tileMatrixMaxY
                                                                        }) => {
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

      // now determine the tiles we need to request
      if (closestResolutionTileMatrix != null) {
        const {
          tileWidth,
          tileHeight,
        } = closestResolutionTileMatrix

        let {
          tileMinCol,
          tileMaxCol,
          tileMinRow,
          tileMaxRow
        } = getTileIndices(closestResolutionTileMatrix, projectedBoundingBox)

        const layerTileMatrixSet = layer.tileMatrixSets.find(set => set.identifier === tileMatrixSet.identifier)
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
            requests.push({
              url: encodeURI(getTileRequestURL(url, layer.identifier, layer.resource ? layer.resource.format : 'image/png', tileMatrixSet.identifier, closestResolutionTileMatrix.identifier, y, x, layer.style)),
              width: tileWidth,
              height: tileHeight,
              tileBounds: tileBounds,
              imageBounds: [projectedBoundingBox.minLon, projectedBoundingBox.minLat, projectedBoundingBox.maxLon, projectedBoundingBox.maxLat],
              tileSRS: srs
            })
          }
        }
      }

    })

    return requests
  }
}
