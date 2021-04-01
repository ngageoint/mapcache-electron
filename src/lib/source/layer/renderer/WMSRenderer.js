import isNil from 'lodash/isNil'
import GeoServiceUtilities from '../../../util/GeoServiceUtilities'
import TileBoundingBoxUtils from '../../../util/TileBoundingBoxUtils'
import ServiceConnectionUtils from '../../../network/ServiceConnectionUtils'
import CancellableTileRequest from '../../../network/CancellableTileRequest'
import NetworkTileRenderer from './NetworkTileRenderer'
import ProjectionUtilities from '../../../projection/ProjectionUtilities'

export default class WMSRenderer extends NetworkTileRenderer {
  constructor (layer) {
    super(layer)
    this.axiosRequestScheduler = ServiceConnectionUtils.getAxiosRequestScheduler(this.layer.rateLimit)
  }

  async renderTile (coords, callback) {
    if (this.hasError()) {
      callback (this.error, null)
    } else {
      let {x, y, z} = coords

      let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
      // assumes projection from 3857 to 4326
      let tileUpperRight = ProjectionUtilities.wgs84ToWebMercator.inverse([tileBbox.maxLon, tileBbox.maxLat])
      let tileLowerLeft = ProjectionUtilities.wgs84ToWebMercator.inverse([tileBbox.minLon, tileBbox.minLat])
      let fullExtent = this.layer.extent
      if (!TileBoundingBoxUtils.tileIntersects(tileUpperRight, tileLowerLeft, [fullExtent[2], fullExtent[3]], [fullExtent[0], fullExtent[1]])) {
        return callback(null, null)
      }

      let referenceSystemName = 'srs'
      let bbox = tileBbox.minLon + ',' + tileBbox.minLat + ',' + tileBbox.maxLon + ',' + tileBbox.maxLat
      if (this.layer.version === '1.3.0') {
        referenceSystemName = 'crs'
      }

      const cancellableTileRequest = new CancellableTileRequest()
      const url = GeoServiceUtilities.getTileRequestURL(this.layer.filePath, this.layer.layers, 256, 256, bbox, referenceSystemName, this.layer.version, this.layer.format)
      cancellableTileRequest.requestTile(this.axiosRequestScheduler, url, this.retryAttempts, this.timeoutMs).then(({dataUrl, error}) => {
        if (!isNil(error)) {
          this.setError(error)
        }
        callback(error, dataUrl)
      })
    }
  }
}
