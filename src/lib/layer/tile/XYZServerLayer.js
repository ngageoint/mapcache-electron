import NetworkTileLayer from './NetworkTileLayer'
import { generateUrlForTile } from '../../util/XYZTileUtilities'
import { XYZ_SERVER } from '../LayerTypes'

export default class XYZServerLayer extends NetworkTileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.subdomains = configuration.subdomains
    this.extent = configuration.extent || [-180, -90, 180, 90]
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: XYZ_SERVER,
        subdomains: this.subdomains
      }
    }
  }

  update (configuration) {
    super.update(configuration)
  }

  /**
   * Gets the tile url for this service
   * @param coords
   */
  getTileUrl (coords) {
    return generateUrlForTile(this.filePath, this.subdomains || [], coords.x, coords.y, coords.z)
  }
}
