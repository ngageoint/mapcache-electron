import { ipcRenderer } from 'electron'
import GeoTiffRenderer from './GeoTiffRenderer'
import UniqueIDUtilities from '../../../util/UniqueIDUtilities'

/**
 * GeoTIFF Renderer
 */
export default class ElectronGeoTiffRenderer extends GeoTiffRenderer {
  tileRequests = {}

  /**
   * Cancels a geotiff tile request
   * @param coords
   */
  cancel (coords) {
    const coordsString = coords.x + '_' + coords.y + '_' + coords.z
    if (this.tileRequests[coordsString]) {
      const requestId = this.tileRequests[coordsString].id
      ipcRenderer.send('cancel_tile_request', {id: requestId})
      ipcRenderer.removeAllListeners('request_tile_' + requestId)
      delete this.tileRequests[coordsString]
    }
  }

  /**
   * Will make a request to a worker thread that will generate the tile data to keep the UI thread running smoooth.
   * @param coords
   * @param callback
   * @returns {Promise<{canvas: *}>}
   * @override
   */
  async renderTile (coords, callback) {
    if (GeoTiffRenderer.intersects(coords, this.layer.extent)) {
      const coordsString = coords.x + '_' + coords.y + '_' + coords.z

      const tileRequest = {
        id: UniqueIDUtilities.createUniqueID(),
        layerType: this.layer.layerType,
        rasterFile: this.layer.rasterFile,
        coords: coords,
        width: 256,
        height: 256,
        bitsPerSample: this.bitsPerSample,
        bytesPerSample: this.bytesPerSample,
        sampleFormat: this.layer.sampleFormat,
        imageOrigin: this.imageOrigin,
        imageResolution: this.imageResolution,
        paletteBand: this.layer.paletteBand,
        redBand: this.layer.redBand,
        redBandMin: this.layer.redBandMin,
        redBandMax: this.layer.redBandMax,
        greenBand: this.layer.greenBand,
        greenBandMin: this.layer.greenBandMin,
        greenBandMax: this.layer.greenBandMax,
        blueBand: this.layer.blueBand,
        blueBandMin: this.layer.blueBandMin,
        blueBandMax: this.layer.blueBandMax,
        grayBand: this.layer.grayBand,
        grayBandMin: this.layer.grayBandMin,
        grayBandMax: this.layer.grayBandMax,
        alphaBand: this.layer.alphaBand,
        renderingMethod: this.layer.renderingMethod,
        grayScaleColorGradient: this.layer.grayScaleColorGradient,
        extent: this.layer.extent,
        srs: this.layer.srs,
        globalNoDataValue: this.layer.globalNoDataValue,
        stretchToMinMax: this.layer.stretchToMinMax,
        littleEndian: this.layer.littleEndian,
        imageWidth: this.layer.image.getWidth(),
        imageHeight: this.layer.image.getHeight(),
        colorMap: this.colorMap
      }

      this.tileRequests[coordsString] = tileRequest
      ipcRenderer.once('request_tile_' + tileRequest.id, (event, result) => {
        delete this.tileRequests[coordsString]
        try {
          if (result.error) {
            callback(result.error, null)
          } else {
            callback(null, result.base64Image)
          }
        } catch (e) {
          callback(e, null)
        }
      })
      ipcRenderer.send('request_tile', tileRequest)
    } else {
      callback(null, null)
    }
  }
}
