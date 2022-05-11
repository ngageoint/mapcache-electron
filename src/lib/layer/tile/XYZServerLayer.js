import NetworkTileLayer from './NetworkTileLayer'
import { generateUrlForTile } from '../../util/xyz/XYZTileUtilities'
import { XYZ_SERVER } from '../LayerTypes'
import { getTilesForExtentAtZoom } from '../../util/xyz/WGS84XYZTileUtilities'
import { WEB_MERCATOR, WORLD_GEODETIC_SYSTEM } from '../../projection/ProjectionConstants'

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
   * @param webMercatorBoundingBox
   * @param coords
   * @param size
   * @param projectedBoundingBoxFunction
   */
  getTileRequestData (webMercatorBoundingBox, coords, size, projectedBoundingBoxFunction) {
    const projectedBoundingBox = projectedBoundingBoxFunction(webMercatorBoundingBox, this.srs)

    const requests = []

    // this xyz server is in 4326, so we should request data appropriately
    if (this.srs === WORLD_GEODETIC_SYSTEM) {
      // need to get coords in 4326 for the projectedBoundingBox
      // adjust zoom to better match resolution
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
      requests.push({
        url: this.getTileUrl(coords),
        width: size.x,
        height: size.y,
        tileBounds: [projectedBoundingBox.minLon, projectedBoundingBox.minLat, projectedBoundingBox.maxLon, projectedBoundingBox.maxLat],
        imageBounds: [projectedBoundingBox.minLon, projectedBoundingBox.minLat, projectedBoundingBox.maxLon, projectedBoundingBox.maxLat],
        tileSRS: this.srs
      })
    }
    return requests
  }
}
