import TileLayer from './TileLayer'
import * as GeoTIFF from 'geotiff'
import ProjectionUtilities from '../../../projection/ProjectionUtilities'
import isNil from 'lodash/isNil'
import GeoTiffUtilities from '../../../util/GeoTiffUtilities'
import LayerTypes from '../LayerTypes'
import fs from 'fs'
import path from 'path'

/**
 * Layer to handle reading a GeoTIFF and how to interpret it
 */
export default class GeoTiffLayer extends TileLayer {
  geotiff
  image
  fileDirectory
  rasterFile
  photometricInterpretation
  colorMap
  stretchToMinMax
  renderingMethod
  grayScaleColorGradient
  redBand
  redBandMin
  redBandMax
  greenBand
  greenBandMin
  greenBandMax
  blueBand
  blueBandMin
  blueBandMax
  grayBand
  grayBandMin
  grayBandMax
  paletteBand
  alphaBand
  enableGlobalNoDataValue
  globalNoDataValue
  bandOptions
  littleEndian
  sampleFormat

  update (configuration) {
    super.update(configuration)
    this.photometricInterpretation = configuration.photometricInterpretation
    this.samplesPerPixel = configuration.samplesPerPixel
    this.bitsPerSample = configuration.bitsPerSample
    this.colorMap = configuration.colorMap
    this.stretchToMinMax = configuration.stretchToMinMax
    this.renderingMethod = configuration.renderingMethod
    this.redBand = configuration.redBand
    this.redBandMin = configuration.redBandMin
    this.redBandMax = configuration.redBandMax
    this.greenBand = configuration.greenBand
    this.greenBandMin = configuration.greenBandMin
    this.greenBandMax = configuration.greenBandMax
    this.blueBand = configuration.blueBand
    this.blueBandMin = configuration.blueBandMin
    this.blueBandMax = configuration.blueBandMax
    this.grayScaleColorGradient = configuration.grayScaleColorGradient
    this.grayBand = configuration.grayBand
    this.grayBandMin = configuration.grayBandMin
    this.grayBandMax = configuration.grayBandMax
    this.alphaBand = configuration.alphaBand
    this.paletteBand = configuration.paletteBand
    this.bandOptions = configuration.bandOptions
    this.globalNoDataValue = configuration.globalNoDataValue
    this.enableGlobalNoDataValue = configuration.enableGlobalNoDataValue
    this.opacity = configuration.opacity
    if (!isNil(this.renderer)) {
      this.renderer.layer = this
    }
  }

  /**
   * Fields that when changed will require the map to repaint
   * @returns {string[]}
   */
  getRepaintFields() {
    return ['renderingMethod', 'redBand', 'redBandMin', 'redBandMax', 'greenBand', 'greenBandMin', 'greenBandMax', 'blueBand', 'blueBandMin', 'blueBandMax', 'grayScaleColorGradient', 'grayBand', 'grayBandMin', 'grayBandMax', 'alphaBand', 'paletteBand', 'globalNoDataValue', 'enableGlobalNoDataValue'].concat(super.getRepaintFields())
  }

  async initialize () {
    this.geotiff = await GeoTIFF.fromFile(this.filePath)
    this.image = await this.geotiff.getImage()
    this.srs = GeoTiffUtilities.getCRSForGeoTiff(this.image)
    this.fileDirectory = this.image.fileDirectory
    // settings from fileDirectory
    this.colorMap = this.fileDirectory.ColorMap
    this.photometricInterpretation = this.fileDirectory.PhotometricInterpretation
    this.samplesPerPixel = this.fileDirectory.SamplesPerPixel
    this.bitsPerSample = this.fileDirectory.BitsPerSample.slice()
    this.sampleFormat = this.fileDirectory.SampleFormat
    this.rasterFile = this._configuration.rasterFile
    this.littleEndian = this.image.littleEndian

    // THIS PROCESS TAKES A BIT OF TIME, SHOULD ONLY HAPPEN ON FIRST INIT
    if (isNil(this.rasterFile)) {
      const rasters = await this.image.readRasters({interleave: true})
      this.rasterFile = path.join(path.dirname(this.filePath), 'data.bin')
      fs.writeFileSync(this.rasterFile, rasters)
    }

    if (this._configuration.bandOptions) {
      this.stretchToMinMax = this._configuration.stretchToMinMax
      this.renderingMethod = this._configuration.renderingMethod
      // rgb options
      this.redBand = this._configuration.redBand
      this.redBandMin = this._configuration.redBandMin
      this.redBandMax = this._configuration.redBandMax
      this.greenBand = this._configuration.greenBand
      this.greenBandMin = this._configuration.greenBandMin
      this.greenBandMax = this._configuration.greenBandMax
      this.blueBand = this._configuration.blueBand
      this.blueBandMin = this._configuration.blueBandMin
      this.blueBandMax = this._configuration.blueBandMax
      // grey scale options
      this.grayScaleColorGradient = this._configuration.grayScaleColorGradient
      this.grayBand = this._configuration.grayBand
      this.grayBandMin = this._configuration.grayBandMin
      this.grayBandMax = this._configuration.grayBandMax
      // palette options
      this.paletteBand = this._configuration.paletteBand
      // alpha options
      this.alphaBand = this._configuration.alphaBand
      this.globalNoDataValue = this._configuration.globalNoDataValue
      this.enableGlobalNoDataValue = this._configuration.enableGlobalNoDataValue
      // available bands to assign
      this.bandOptions = this._configuration.bandOptions
    } else {
      this.enableGlobalNoDataValue = false
      this.globalNoDataValue = this.image.getGDALNoData()
      if (this.globalNoDataValue !== null) {
        this.enableGlobalNoDataValue = true
      }

      this.redBand = 0
      this.greenBand = 0
      this.blueBand = 0
      this.grayBand = 0
      this.paletteBand = 0
      this.alphaBand = 0
      this.grayScaleColorGradient = 1
      this.bandOptions = [{
        value: 0,
        name: 'No band'
      }]
      // setup band options
      for (let i = 1; i <= this.bitsPerSample.length; i++) {
        let name = 'Band ' + i
        let min = 0
        let max = GeoTiffUtilities.getMaxForDataType(this.bitsPerSample[i])
        this.bandOptions.push({
          value: i,
          name: name,
          min,
          max
        })
      }

      // determine rendering method
      if (this.photometricInterpretation === 6) {
        this.renderingMethod = 3
      } else if (this.photometricInterpretation === 5) {
        this.renderingMethod = 4
      } else if (this.photometricInterpretation === 8) {
        this.renderingMethod = 5
      } else if (this.photometricInterpretation === 3) {
        this.renderingMethod = 2
        // this is the default
        this.paletteBand = 1
        if (this.samplesPerPixel > 1) {
          this.alphaBand = 2
        }
      } else if (this.samplesPerPixel >= 3 || this.photometricInterpretation === 2) {
        this.renderingMethod = 1
        // this is the default
        this.redBand = 1
        this.greenBand = 2
        this.blueBand = 3
        if (this.samplesPerPixel > 3) {
          this.alphaBand = 4
        }
        this.redBandMin = this.bandOptions[this.redBand].min
        this.redBandMax = this.bandOptions[this.redBand].max
        this.greenBandMin = this.bandOptions[this.greenBand].min
        this.greenBandMax = this.bandOptions[this.greenBand].max
        this.blueBandMin = this.bandOptions[this.blueBand].min
        this.blueBandMax = this.bandOptions[this.blueBand].max
      } else if (this.samplesPerPixel === 1 || this.photometricInterpretation <= 1) {
        this.renderingMethod = 0
        this.grayScaleColorGradient = this.photometricInterpretation
        this.grayBand = 1
        this.grayBandMin = this.bandOptions[this.grayBand].min
        this.grayBandMax = this.bandOptions[this.grayBand].max
      } else {
        this.photometricInterpretation = 1
      }
      this.stretchToMinMax = false
    }
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: LayerTypes.GEOTIFF,
        photometricInterpretation: this.photometricInterpretation,
        samplesPerPixel: this.samplesPerPixel,
        bitsPerSample: this.bitsPerSample,
        sampleFormat: this.sampleFormat,
        colorMap: this.colorMap,
        visible: this.visible || false,
        stretchToMinMax: this.stretchToMinMax,
        renderingMethod: this.renderingMethod,
        redBand: this.redBand,
        redBandMin: this.redBandMin,
        redBandMax: this.redBandMax,
        greenBand: this.greenBand,
        greenBandMin: this.greenBandMin,
        greenBandMax: this.greenBandMax,
        blueBand: this.blueBand,
        blueBandMin: this.blueBandMin,
        blueBandMax: this.blueBandMax,
        grayScaleColorGradient: this.grayScaleColorGradient,
        grayBand: this.grayBand,
        grayBandMin: this.grayBandMin,
        grayBandMax: this.grayBandMax,
        alphaBand: this.alphaBand,
        paletteBand: this.paletteBand,
        bandOptions: this.bandOptions,
        globalNoDataValue: this.globalNoDataValue,
        enableGlobalNoDataValue: this.enableGlobalNoDataValue,
        rasterFile: this.rasterFile,
        littleEndian: this.littleEndian,
      }
    }
  }

  get extent () {
    if (this._configuration.extent) {
      return this._configuration.extent
    }
    // [minx, miny, maxx, maxy]
    const bbox = this.image.getBoundingBox()
    const epsgString = 'EPSG:' + this.srs
    const transform = ProjectionUtilities.getConverter('EPSG:4326', epsgString)

    const minCoord = transform.inverse([bbox[0], bbox[1]])
    const maxCoord = transform.inverse([bbox[2], bbox[3]])

    this._configuration.extent = [minCoord[0], minCoord[1], maxCoord[0], maxCoord[1]]
    return this._configuration.extent
  }

  cancel (coords) {
    this.renderer.cancel(coords)
  }
}
