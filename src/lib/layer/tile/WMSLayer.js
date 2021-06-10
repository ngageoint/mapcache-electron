import { getTileRequestURL } from '../../util/GeoServiceUtilities'
import NetworkTileLayer from './NetworkTileLayer'
import { WMS } from '../LayerTypes'

export default class WMSLayer extends NetworkTileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.layers = configuration.layers
    this.format = configuration.format || 'image/png'
    this.version = configuration.version
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: WMS,
        version: this.version,
        layers: this.layers,
        formats: this.formats
      }
    }
  }

  update (configuration) {
    super.update(configuration)
  }

  /**
   * Function for getting the tile request url for this service
   * @param coords
   */
  getTileUrl (coords) {
    let {x, y, z} = coords
    let tileBbox = window.mapcache.getWebMercatorBoundingBoxFromXYZ(x, y, z)
    let referenceSystemName = 'srs'
    let bbox = tileBbox.minLon + ',' + tileBbox.minLat + ',' + tileBbox.maxLon + ',' + tileBbox.maxLat
    if (this.version === '1.3.0') {
      referenceSystemName = 'crs'
    }
    return getTileRequestURL(this.filePath, this.layers, 256, 256, bbox, referenceSystemName, this.version, this.format)
  }
}
