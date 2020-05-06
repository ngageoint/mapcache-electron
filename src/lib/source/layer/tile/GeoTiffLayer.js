import GeoTiffRenderer from '../renderer/GeoTiffRenderer'
import TileLayer from './TileLayer'
import * as GeoTIFF from 'geotiff'
import gdal from 'gdal'
import GDALUtilities from '../../../GDALUtilities'

export default class GeoTiffLayer extends TileLayer {
  geotiff
  image
  fileDirectory
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
  enableGlobalOpacity
  globalOpacity
  bandOptions

  static getMaxForDataType (datatype) {
    let max = 255
    if (datatype === gdal.GDT_UInt16) {
      max = 65535
    }
    return max
  }

  static getColorInterpretationNum (colorInterpretation) {
    let colorInterpNum = 0
    if (colorInterpretation !== undefined && colorInterpretation !== null) {
      if (colorInterpretation === 1 || colorInterpretation === '1' || colorInterpretation.toUpperCase() === 'GRAY' || colorInterpretation.toUpperCase() === 'GREY') {
        colorInterpNum = 1
      } else if (colorInterpretation === 2 || colorInterpretation === '2' || colorInterpretation.toUpperCase() === 'PALETTE' || colorInterpretation.toUpperCase() === 'PALETTED') {
        colorInterpNum = 2
      } else if (colorInterpretation === 3 || colorInterpretation === '3' || colorInterpretation.toUpperCase() === 'RED') {
        colorInterpNum = 3
      } else if (colorInterpretation === 4 || colorInterpretation === '4' || colorInterpretation.toUpperCase() === 'GREEN') {
        colorInterpNum = 4
      } else if (colorInterpretation === 5 || colorInterpretation === '5' || colorInterpretation.toUpperCase() === 'BLUE') {
        colorInterpNum = 5
      } else if (colorInterpretation === 6 || colorInterpretation === '6' || colorInterpretation.toUpperCase() === 'ALPHA') {
        colorInterpNum = 6
      }
    }
    return colorInterpNum
  }

  async initialize () {
    // I cannot get this to work with the node-gdal library, not sure why
    // gdalinfo /vsis3/landsat-pds/c1/L8/139/045/LC08_L1TP_139045_20170304_20170316_01_T1/LC08_L1TP_139045_20170304_20170316_01_T1_B8.TIF
    this.style = this._configuration.style || {
      opacity: 1
    }
    this.geotiff = await GeoTIFF.fromFile(this.filePath)
    this.image = await this.geotiff.getImage()
    this.fileDirectory = this.image.fileDirectory
    this.photometricInterpretation = this.fileDirectory.PhotometricInterpretation
    this.samplesPerPixel = this.fileDirectory.SamplesPerPixel
    this.bitsPerSample = this.fileDirectory.BitsPerSample
    this.ds = gdal.open(this.filePath)
    this.naturalWebMercatorZoom = GDALUtilities.getWebMercatorZoomLevelForGeoTIFF(this.ds)
    this.colorMap = this.fileDirectory.ColorMap
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
      this.globalOpacity = this._configuration.globalOpacity
      this.enableGlobalOpacity = this._configuration.enableGlobalOpacity
      // available bands to assign
      this.bandOptions = this._configuration.bandOptions
    } else {
      this.enableGlobalNoDataValue = false
      this.enableGlobalOpacity = false
      this.globalOpacity = 0
      this.redBand = 0
      this.greenBand = 0
      this.blueBand = 0
      this.grayBand = 0
      this.paletteBand = 0
      this.alphaBand = 0
      this.grayScaleColorGradient = 1
      this.bandOptions = [{
        value: 0,
        name: 'No Band'
      }]
      for (let i = 1; i <= this.ds.bands.count(); i++) {
        let band = this.ds.bands.get(i)
        let name = 'Band ' + i
        if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) !== 0) {
          name += ' (' + band.colorInterpretation + ')'
        }
        let min = band.minimum || 0
        let max = band.maximum || GeoTiffLayer.getMaxForDataType(band.dataType)
        this.bandOptions.push({
          value: i,
          name: name,
          min,
          max
        })
        // don't really care if they are different, can disable use of global no data
        if (band.noDataValue !== undefined && band.noDataValue !== null) {
          this.globalNoDataValue = band.noDataValue
          this.enableGlobalNoDataValue = true
        }
      }
      // determine initial rendering method
      if (this.photometricInterpretation === 3) {
        this.renderingMethod = 2
        // this is the default
        this.paletteBand = 1
        for (let i = 1; i <= this.ds.bands.count(); i++) {
          let band = this.ds.bands.get(i)
          if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 2) {
            this.paletteBand = i
          } else if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 6) {
            let prevAlphaBand = this.alphaBand
            this.alphaBand = i
            if (this.paletteBand === this.alphaBand) {
              this.paletteBand = prevAlphaBand
            }
          }
        }
      } else if (this.samplesPerPixel >= 3 || this.photometricInterpretation === 2) {
        this.renderingMethod = 1
        // this is the default
        this.redBand = 1
        this.greenBand = 2
        this.blueBand = 3
        // check if these bands have a color interp assigned, if so, reorder appropriately
        for (let i = 1; i <= this.ds.bands.count(); i++) {
          let band = this.ds.bands.get(i)
          if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 3) {
            let prevRedBand = this.redBand
            this.redBand = i
            if (this.greenBand === this.redBand) {
              this.greenBand = prevRedBand
            } else if (this.blueBand === this.redBand) {
              this.blueBand = prevRedBand
            }
          } else if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 4) {
            let prevGreenBand = this.greenBand
            this.greenBand = i
            if (this.redBand === this.greenBand) {
              this.redBand = prevGreenBand
            } else if (this.blueBand === this.greenBand) {
              this.blueBand = prevGreenBand
            }
          } else if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 5) {
            let prevBlueBand = this.blueBand
            this.blueBand = i
            if (this.redBand === this.blueBand) {
              this.redBand = prevBlueBand
            } else if (this.greenBand === this.blueBand) {
              this.greenBand = prevBlueBand
            }
          } else if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 6) {
            let prevAlphaBand = this.alphaBand
            this.alphaBand = i
            if (this.redBand === this.alphaBand) {
              this.redBand = prevAlphaBand
            } else if (this.greenBand === this.alphaBand) {
              this.greenBand = prevAlphaBand
            } else if (this.blueBand === this.alphaBand) {
              this.blueBand = prevAlphaBand
            }
          }
        }
        this.redBandMin = this.bandOptions[this.redBand].min
        this.redBandMax = this.bandOptions[this.redBand].max
        this.greenBandMin = this.bandOptions[this.greenBand].min
        this.greenBandMax = this.bandOptions[this.greenBand].max
        this.blueBandMin = this.bandOptions[this.blueBand].min
        this.blueBandMax = this.bandOptions[this.blueBand].max
      } else if (this.samplesPerPixel === 1 || this.ds.bands.count() === 1 || this.photometricInterpretation <= 1) {
        this.renderingMethod = 0
        this.grayScaleColorGradient = this.photometricInterpretation
        // this is the default
        this.grayBand = 1
        for (let i = 1; i <= this.ds.bands.count(); i++) {
          let band = this.ds.bands.get(i)
          if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 1) {
            this.grayBand = i
          } else if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 6) {
            let prevAlphaBand = this.alphaBand
            this.alphaBand = i
            if (this.grayBand === this.alphaBand) {
              this.grayBand = prevAlphaBand
            }
          }
        }
        this.grayBandMin = this.bandOptions[this.grayBand].min
        this.grayBandMax = this.bandOptions[this.grayBand].max
      } else {
        this.photometricInterpretation = 1
      }
      // should we enable stretch to min max by default
      let shouldStretch = true
      for (let i = 1; i <= this.ds.bands.count(); i++) {
        let band = this.ds.bands.get(i)
        if (!band.minimum || !band.maximum) {
          shouldStretch = true
        }
      }
      this.stretchToMinMax = shouldStretch
    }
    this.renderer = new GeoTiffRenderer(this)
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: 'GeoTIFF',
        photometricInterpretation: this.photometricInterpretation,
        samplesPerPixel: this.samplesPerPixel,
        bitsPerSample: this.bitsPerSample,
        colorMap: this.colorMap,
        info: GDALUtilities.gdalInfo(this.ds, this.image),
        shown: this.shown || true,
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
        globalOpacity: this.globalOpacity,
        enableGlobalOpacity: this.enableGlobalOpacity,
        naturalWebMercatorZoom: this.naturalWebMercatorZoom
      }
    }
  }

  get extent () {
    if (this._configuration.extent) {
      return this._configuration.extent
    }
    let corners = GDALUtilities.sourceCorners(this.ds)
    let ll = corners[3]
    let ur = corners[1]
    let polygon = new gdal.Polygon()
    let ring = new gdal.LinearRing()
    ring.points.add(ll[0], ll[1])
    ring.points.add(ur[0], ll[1])
    ring.points.add(ur[0], ur[1])
    ring.points.add(ll[0], ur[1])
    ring.points.add(ll[0], ll[1])
    polygon.rings.add(ring)

    let envelope = polygon.getEnvelope()
    this._configuration.extent = [envelope.minX, envelope.minY, envelope.maxX, envelope.maxY]
    return this._configuration.extent
  }

  async renderTile (coords, tileCanvas, done) {
    return this.renderer.renderTile(coords, tileCanvas, done)
  }
}
