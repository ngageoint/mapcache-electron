/**
 * GeoTIFF Renderer
 */
import ProjectionUtilities from '../../../projection/ProjectionUtilities'
import TileBoundingBoxUtils from '../../../util/TileBoundingBoxUtils'
import XYZTileUtilities from '../../../util/XYZTileUtilities'
import GeoTiffRenderingUtilities from '../../../util/GeoTiffRenderingUtilities'

export default class GeoTiffRenderer {
  fd
  layer
  bitsPerSample
  bytesPerSample
  imageOrigin
  imageResolution
  constructor (layer) {
    this.layer = layer
    this.bitsPerSample = this.layer.bitsPerSample.slice()
    this.bytesPerSample = this.bitsPerSample.reduce((accumulator, currentValue) => accumulator + currentValue, 0) / 8
    this.imageOrigin = this.layer.image.getOrigin()
    this.imageResolution = this.layer.image.getResolution()
    this.colorMap = new Uint16Array(this.layer.colorMap ? this.layer.colorMap.buffer : 0)
  }

  set layer (layer) {
    this.layer = layer
  }

  static intersects (coords, extent) {
    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(coords.x, coords.y, coords.z)
    let tileUpperRightBuffered = ProjectionUtilities.wgs84ToWebMercator.inverse([tileBbox.maxLon + (tileBbox.maxLon - tileBbox.minLon), tileBbox.maxLat + (tileBbox.maxLat - tileBbox.minLat)])
    let tileLowerLeftBuffered = ProjectionUtilities.wgs84ToWebMercator.inverse([tileBbox.minLon - (tileBbox.maxLon - tileBbox.minLon), tileBbox.minLat - (tileBbox.maxLat - tileBbox.minLat)])
    const fullExtent = XYZTileUtilities.trimExtentToWebMercatorMax(extent)

    // if layer does not overlap with tile request, return an empty tile
    return TileBoundingBoxUtils.tileIntersects(tileUpperRightBuffered, tileLowerLeftBuffered, [fullExtent[2], fullExtent[3]], [fullExtent[0], fullExtent[1]])
  }

  cancel () {
    // do nothing
  }

  /**
   * Will make a request to a worker thread that will generate the tile data to keep the UI thread running smoooth.
   * @param coords
   * @param callback
   * @returns {Promise<{canvas: *}>}
   */
  async renderTile (coords, callback) {
    if (GeoTiffRenderer.intersects(coords, this.layer.extent)) {
      const tileRequest = {
        id: coords.x + '_' + coords.y + '_' + coords.z + '_' + this.layer.name + '_' + Date.now(),
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

      try {
        const result = await GeoTiffRenderingUtilities.requestTile(tileRequest)
        callback(null, result)
      } catch (e) {
        callback(e, null)
      }
    } else {
      callback(null, null)
    }
  }
}
