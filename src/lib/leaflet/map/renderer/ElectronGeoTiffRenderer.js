import ElectronTileRenderer from './ElectronTileRenderer'
import { GEOTIFF } from '../../../layer/LayerTypes'

/**
 * GeoTIFF Renderer
 */
export default class ElectronGeoTiffRenderer extends ElectronTileRenderer {
  constructor (layer, isElectron) {
    super(layer, isElectron)
  }

  set layer (layer) {
    this.layer = layer
  }

  getTileRequest (requestId, coords, size) {
    const request = super.getTileRequest(requestId, coords, size)
    return Object.assign(request, {
      enableGlobalNoDataValue: this.layer.enableGlobalNoDataValue,
      samplesPerPixel: this.layer.samplesPerPixel,
      layerType: GEOTIFF,
      rasterFile: this.layer.rasterFile,
      bitsPerSample: this.layer.bitsPerSample,
      bytesPerSample: this.layer.bytesPerSample,
      sampleFormat: this.layer.sampleFormat,
      imageOrigin: this.layer.imageOrigin,
      imageResolution: this.layer.imageResolution,
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
      imageWidth: this.layer.imageWidth,
      imageHeight: this.layer.imageHeight,
      colorMap: this.layer.colorMap
    })
  }
}
