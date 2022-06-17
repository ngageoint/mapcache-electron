import TileLayer from './TileLayer'
import isNil from 'lodash/isNil'
import { GEOTIFF } from '../LayerTypes'

/**
 * Layer to handle reading a GeoTIFF and how to interpret it
 */
export default class GeoTiffLayer extends TileLayer {
  alphaBand
  bandOptions
  bitsPerSample
  blueBand
  blueBandMin
  blueBandMax
  bytesPerSample
  colorMap
  enableGlobalNoDataValue
  globalNoDataValue
  grayScaleColorGradient
  grayBand
  grayBandMin
  grayBandMax
  greenBand
  greenBandMin
  greenBandMax
  imageHeight
  imageOrigin
  imageResolution
  imageWidth
  layerType
  littleEndian
  paletteBand
  photometricInterpretation
  rasterFile
  redBand
  redBandMin
  redBandMax
  renderingMethod
  sampleFormat
  samplesPerPixel
  srs
  stretchToMinMax
  projection

  constructor (configuration = {}) {
    super(configuration)
    this.update(configuration)
  }

  update (configuration) {
    super.update(configuration)
    this.alphaBand = configuration.alphaBand
    this.bandOptions = configuration.bandOptions
    this.bitsPerSample = configuration.bitsPerSample
    this.blueBand = configuration.blueBand
    this.blueBandMin = configuration.blueBandMin
    this.blueBandMax = configuration.blueBandMax
    this.bytesPerSample = configuration.bytesPerSample
    this.colorMap = configuration.colorMap
    this.enableGlobalNoDataValue = configuration.enableGlobalNoDataValue
    this.globalNoDataValue = configuration.globalNoDataValue
    this.grayScaleColorGradient = configuration.grayScaleColorGradient
    this.grayBand = configuration.grayBand
    this.grayBandMin = configuration.grayBandMin
    this.grayBandMax = configuration.grayBandMax
    this.greenBand = configuration.greenBand
    this.greenBandMin = configuration.greenBandMin
    this.greenBandMax = configuration.greenBandMax
    this.imageHeight = configuration.imageHeight
    this.imageOrigin = configuration.imageOrigin
    this.imageResolution = configuration.imageResolution
    this.imageWidth = configuration.imageWidth
    this.layerType = GEOTIFF
    this.littleEndian = configuration.littleEndian
    this.paletteBand = configuration.paletteBand
    this.photometricInterpretation = configuration.photometricInterpretation
    this.rasterFile = configuration.rasterFile
    this.redBand = configuration.redBand
    this.redBandMin = configuration.redBandMin
    this.redBandMax = configuration.redBandMax
    this.renderingMethod = configuration.renderingMethod
    this.sampleFormat = configuration.sampleFormat
    this.samplesPerPixel = configuration.samplesPerPixel
    this.srs = configuration.srs
    this.stretchToMinMax = configuration.stretchToMinMax
    this.projection = configuration.projection
    if (!isNil(this.renderer)) {
      this.renderer.layer = this
    }
  }

  /**
   * Fields that when changed will require the map to repaint
   * @returns {string[]}
   */
  getRepaintFields () {
    return ['renderingMethod', 'redBand', 'redBandMin', 'redBandMax', 'greenBand', 'greenBandMin', 'greenBandMax', 'blueBand', 'blueBandMin', 'blueBandMax', 'grayScaleColorGradient', 'grayBand', 'grayBandMin', 'grayBandMax', 'alphaBand', 'paletteBand', 'globalNoDataValue', 'enableGlobalNoDataValue', 'stretchToMinMax'].concat(super.getRepaintFields())
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        alphaBand: this.alphaBand,
        bandOptions: this.bandOptions,
        bitsPerSample: this.bitsPerSample,
        blueBand: this.blueBand,
        blueBandMin: this.blueBandMin,
        blueBandMax: this.blueBandMax,
        bytesPerSample: this.bytesPerSample,
        colorMap: this.colorMap,
        enableGlobalNoDataValue: this.enableGlobalNoDataValue,
        globalNoDataValue: this.globalNoDataValue,
        grayScaleColorGradient: this.grayScaleColorGradient,
        grayBand: this.grayBand,
        grayBandMin: this.grayBandMin,
        grayBandMax: this.grayBandMax,
        greenBand: this.greenBand,
        greenBandMin: this.greenBandMin,
        greenBandMax: this.greenBandMax,
        imageHeight: this.imageHeight,
        imageOrigin: this.imageOrigin,
        imageResolution: this.imageResolution,
        imageWidth: this.imageWidth,
        layerType: GEOTIFF,
        littleEndian: this.littleEndian,
        paletteBand: this.paletteBand,
        photometricInterpretation: this.photometricInterpretation,
        rasterFile: this.rasterFile,
        redBand: this.redBand,
        redBandMin: this.redBandMin,
        redBandMax: this.redBandMax,
        renderingMethod: this.renderingMethod,
        sampleFormat: this.sampleFormat,
        samplesPerPixel: this.samplesPerPixel,
        srs: this.srs,
        stretchToMinMax: this.stretchToMinMax,
        projection: this.projection
      }
    }
  }

  cancel (coords) {
    this.renderer.cancel(coords)
  }
}
