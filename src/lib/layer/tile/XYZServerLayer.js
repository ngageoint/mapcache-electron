import NetworkTileLayer from './NetworkTileLayer'
import { generateUrlForTile, tilesInExtentAtZoom, trimExtentToWebMercatorMax } from '../../util/xyz/XYZTileUtilities'
import { XYZ_SERVER } from '../LayerTypes'
import {
  getTilesForExtentAtZoom,
  getWGS84ExtentFromXYZ
} from '../../util/xyz/WGS84XYZTileUtilities'
import { WEB_MERCATOR } from '../../projection/ProjectionConstants'

export default class XYZServerLayer extends NetworkTileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.subdomains = configuration.subdomains
    this.minZoom = configuration.minZoom || 0
    this.maxZoom = configuration.maxZoom || 20
    this.srs = configuration.srs || WEB_MERCATOR
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: XYZ_SERVER,
        subdomains: this.subdomains,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
        srs: this.srs
      }
    }
  }

  update (configuration) {
    super.update(configuration)
    this.subdomains = configuration.subdomains
    this.extent = configuration.extent || [-180, -90, 180, 90]
    this.minZoom = configuration.minZoom || 0
    this.maxZoom = configuration.maxZoom || 20
    this.srs = configuration.srs || WEB_MERCATOR
  }

  getTileUrl (coords) {
    return generateUrlForTile(this.filePath, this.subdomains || [], coords.x, coords.y, coords.z)
  }

  /**
   * Gets the tile url for this service
   * @param boundingBox
   * @param coords
   * @param size
   * @param crs
   * @param projectedBoundingBoxFunction
   */
  getTileRequestData (boundingBox, coords, size, crs, projectedBoundingBoxFunction) {
    const projectedBoundingBox = projectedBoundingBoxFunction(boundingBox, this.srs)
    const requests = []

    // source tiles are in same projection as request
    if (this.srs === crs) {
      requests.push({
        url: this.getTileUrl(coords),
        width: size.x,
        height: size.y,
        tileBounds: [projectedBoundingBox.minLon, projectedBoundingBox.minLat, projectedBoundingBox.maxLon, projectedBoundingBox.maxLat],
        imageBounds: [projectedBoundingBox.minLon, projectedBoundingBox.minLat, projectedBoundingBox.maxLon, projectedBoundingBox.maxLat],
        tileSRS: this.srs
      })
    } else {
      if (crs === WEB_MERCATOR) {
        const zoom = Math.max(0, coords.z - 1)
        const tiles = getTilesForExtentAtZoom([projectedBoundingBox.minLon, projectedBoundingBox.minLat, projectedBoundingBox.maxLon, projectedBoundingBox.maxLat], zoom)
        tiles.forEach((tile) => {
          requests.push({
            url: this.getTileUrl(tile.coords),
            width: size.x,
            height: size.y,
            tileBounds: tile.extent,
            imageBounds: [projectedBoundingBox.minLon, projectedBoundingBox.minLat, projectedBoundingBox.maxLon, projectedBoundingBox.maxLat],
            tileSRS: this.srs
          })
        })
      } else {
        const zoom = Math.min(20, coords.z + 1)
        const extent = getWGS84ExtentFromXYZ(coords.x, coords.y, coords.z)
        const tiles = tilesInExtentAtZoom([[extent[1], extent[0]], [extent[3], extent[2]]], zoom)
        const webMercatorExtent = window.mapcache.convertToWebMercator(trimExtentToWebMercatorMax(extent))
        tiles.forEach((tile) => {
          const tileWebMercatorBounds = window.mapcache.getWebMercatorBoundingBoxFromXYZ(tile.x, tile.y, tile.z)
          requests.push({
            url: this.getTileUrl(tile),
            width: size.x,
            height: size.y,
            tileBounds: [tileWebMercatorBounds.minLon, tileWebMercatorBounds.minLat, tileWebMercatorBounds.maxLon, tileWebMercatorBounds.maxLat],
            imageBounds: [webMercatorExtent.minLon, webMercatorExtent.minLat, webMercatorExtent.maxLon, webMercatorExtent.maxLat],
            tileSRS: this.srs
          })
        })
      }
    }
    return requests
  }
}
