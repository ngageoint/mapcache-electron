import isNil from 'lodash/isNil'
import { getTileRequestURL } from '../../../util/GeoServiceUtilities'
import { getAxiosRequestScheduler } from '../../../network/ServiceConnectionUtils'
import CancellableTileRequest from '../../../network/CancellableTileRequest'
import NetworkTileRenderer from './NetworkTileRenderer'

export default class WMSRenderer extends NetworkTileRenderer {
  isElectron
  getWebMercatorBoundingBoxFromXYZ
  tileIntersectsXYZ

  constructor (layer, isElectron) {
    super(layer)
    this.isElectron = isElectron
    this.axiosRequestScheduler = getAxiosRequestScheduler(this.layer.rateLimit)
    if (isElectron) {
      const { getWebMercatorBoundingBoxFromXYZ, tileIntersectsXYZ } = require('../../../util/TileBoundingBoxUtils')
      this.getWebMercatorBoundingBoxFromXYZ = getWebMercatorBoundingBoxFromXYZ
      this.tileIntersectsXYZ = tileIntersectsXYZ
    } else {
      this.getWebMercatorBoundingBoxFromXYZ = window.mapcache.getWebMercatorBoundingBoxFromXYZ
      this.tileIntersectsXYZ = window.mapcache.tileIntersectsXYZ
    }
  }

  async renderTile (coords, callback) {
    if (!isNil(this.error)) {
      callback (this.error, null)
    } else {
      let {x, y, z} = coords
      let tileBbox = this.getWebMercatorBoundingBoxFromXYZ(x, y, z)

      if (!this.tileIntersectsXYZ(x, y, z, this.layer.extent)) {
        callback(null, null)
        return
      }

      let referenceSystemName = 'srs'
      let bbox = tileBbox.minLon + ',' + tileBbox.minLat + ',' + tileBbox.maxLon + ',' + tileBbox.maxLat
      if (this.layer.version === '1.3.0') {
        referenceSystemName = 'crs'
      }

      const cancellableTileRequest = new CancellableTileRequest()
      const url = getTileRequestURL(this.layer.filePath, this.layer.layers, 256, 256, bbox, referenceSystemName, this.layer.version, this.layer.format)
      cancellableTileRequest.requestTile(this.axiosRequestScheduler, url, this.retryAttempts, this.timeoutMs, this.layer.withCredentials).then(({dataUrl, error}) => {
        if (!isNil(error)) {
          this.setError(error)
        }
        if (isNil(dataUrl) || dataUrl.startsWith('data:text/html')) {
          dataUrl = null
        }
        callback(error, dataUrl)
      })
    }
  }
}
