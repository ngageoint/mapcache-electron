import NetworkTileLayer from './NetworkTileLayer'
import { generateUrlForTile } from '../../util/xyz/XYZTileUtilities'
import { XYZ_SERVER } from '../LayerTypes'

export default class XYZServerLayer extends NetworkTileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.subdomains = configuration.subdomains
    this.minZoom = configuration.minZoom || 0
    this.maxZoom = configuration.maxZoom || 20
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: XYZ_SERVER,
        subdomains: this.subdomains,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom
      }
    }
  }

  update (configuration) {
    super.update(configuration)
    this.subdomains = configuration.subdomains
    this.extent = configuration.extent || [-180, -90, 180, 90]
    this.minZoom = configuration.minZoom || 0
    this.maxZoom = configuration.maxZoom || 20
  }

  getTileUrl (coords) {
    return generateUrlForTile(this.filePath, this.subdomains || [], coords.x, coords.y, coords.z)
  }

  /**
   * Gets the tile url for this service
   * @param webMercatorBoundingBox
   * @param coords
   * @param size
   */
  getTileRequestData (webMercatorBoundingBox, coords, size) {
    return {
      srs: 'EPSG:3857',
      requiresReprojection: false,
      bbox: webMercatorBoundingBox,
      webRequests: [{
        url: this.getTileUrl(coords),
        width: size.x,
        height: size.y,
        tileBounds: [webMercatorBoundingBox.minLon, webMercatorBoundingBox.minLat, webMercatorBoundingBox.maxLon, webMercatorBoundingBox.maxLat]
      }],
    }
  }
}
