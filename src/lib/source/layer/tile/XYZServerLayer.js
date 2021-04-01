import NetworkTileLayer from './NetworkTileLayer'
import XYZTileUtilities from '../../../util/XYZTileUtilities'
import LayerTypes from '../LayerTypes'

export default class XYZServerLayer extends NetworkTileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.subdomains = configuration.subdomains
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: LayerTypes.XYZ_SERVER,
        subdomains: this.subdomains
      }
    }
  }

  update (configuration) {
    super.update(configuration)
  }

  get extent () {
    if (this._configuration.extent) {
      return this._configuration.extent
    }
    this._configuration.extent = [-180, -90, 180, 90]
    return this._configuration.extent
  }

  /**
   * Gets the tile url for this service
   * @param coords
   */
  getTileUrl (coords) {
    return XYZTileUtilities.generateUrlForTile(this.filePath, this.subdomains || [], coords.x, coords.y, coords.z)
  }
}
