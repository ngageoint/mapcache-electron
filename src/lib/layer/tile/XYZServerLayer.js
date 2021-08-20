import NetworkTileLayer from './NetworkTileLayer'
import { generateUrlForTile } from '../../util/XYZTileUtilities'
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

  /**
   * Gets the tile url for this service
   * @param coords
   */
  getTileRequestData (coords) {
    return { url: generateUrlForTile(this.filePath, this.subdomains || [], coords.x, coords.y, coords.z)}
  }
}
