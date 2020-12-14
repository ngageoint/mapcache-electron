import GeoTiffRenderer from '../renderer/GeoTiffRenderer'
import TileLayer from './TileLayer'
import * as GeoTIFF from 'geotiff'
import proj4 from 'proj4'
import _ from 'lodash'
import defs from '../../../projection/proj4Defs'
import { ipcRenderer } from 'electron'
for (const name in defs) {
  if (defs[name]) {
    proj4.defs(name, defs[name])
  }
}

/**
 * Layer to handle reading a GeoTIFF and how to interpret it
 */
export default class GeoTiffLayer extends TileLayer {
  geotiff
  image
  fileDirectory
  rasters
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

  static getMaxForDataType (bitsPerSample) {
    let max = 255
    if (bitsPerSample === 16) {
      max = 65535
    }
    return max
  }

  static getModelTypeName (modelTypeCode) {
    let modelTypeName
    switch(modelTypeCode) {
      case 0:
        modelTypeName = 'undefined'
        break;
      case 1:
        modelTypeName = 'ModelTypeProjected'
        break;
      case 2:
        modelTypeName = 'ModelTypeGeographic'
        break;
      case 3:
        modelTypeName = 'ModelTypeGeocentric'
        break;
      case 32767:
        modelTypeName = 'user-defined'
        break;
      default:
        if (modelTypeCode < 32767) {
          modelTypeName= 'GeoTIFF Reserved Codes'
        } else if (modelTypeCode>32767) {
          modelTypeName= 'Private User Implementations'
        }
        break
    }
    return modelTypeName
  }

  /**
   * Determine EPSG code of geotiff
   * @param image
   */
  static getCRSForGeoTiff (image) {
    let crs = 0
    if (Object.prototype.hasOwnProperty.call(image.getGeoKeys(),'GTModelTypeGeoKey') === false) {
      crs = 0
    } else if (GeoTiffLayer.getModelTypeName(image.getGeoKeys().GTModelTypeGeoKey ) === 'ModelTypeGeographic' && Object.prototype.hasOwnProperty.call(image.getGeoKeys(),'GeographicTypeGeoKey')) {
      crs = image.getGeoKeys()['GeographicTypeGeoKey'];
    } else {
      if (GeoTiffLayer.getModelTypeName(image.getGeoKeys().GTModelTypeGeoKey) === 'ModelTypeProjected' && Object.prototype.hasOwnProperty.call(image.getGeoKeys(),'ProjectedCSTypeGeoKey')) {
        crs = image.getGeoKeys()['ProjectedCSTypeGeoKey']
      } else if (GeoTiffLayer.getModelTypeName(image.getGeoKeys().GTModelTypeGeoKey) === 'user-defined') {
        if (Object.prototype.hasOwnProperty.call(image.getGeoKeys(),'ProjectedCSTypeGeoKey')) {
          crs = image.getGeoKeys()['ProjectedCSTypeGeoKey']
        } else if (Object.prototype.hasOwnProperty.call(image.getGeoKeys(),'GeographicTypeGeoKey')) {
          crs = image.getGeoKeys()['GeographicTypeGeoKey']
        } else if (Object.prototype.hasOwnProperty.call(image.getGeoKeys(),'GTCitationGeoKey') && image.getGeoKeys()['GTCitationGeoKey'].search("WGS_1984_Web_Mercator_Auxiliary_Sphere") !== -1) {
          crs = 3857
        }
      }
    }
    return crs
  }

  updateStyle (configuration) {
    this.photometricInterpretation = configuration.photometricInterpretation
    this.samplesPerPixel = configuration.samplesPerPixel
    this.bitsPerSample = configuration.bitsPerSample
    this.colorMap = configuration.colorMap
    this.visible = configuration.visible || false
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
    this.globalOpacity = configuration.globalOpacity
    this.enableGlobalOpacity = configuration.enableGlobalOpacity
    this.renderer = new GeoTiffRenderer(this)
  }

  async initialize (inWorker = false) {
    this.geotiff = await GeoTIFF.fromFile(this.filePath)
    this.image = await this.geotiff.getImage()
    this.srs = GeoTiffLayer.getCRSForGeoTiff(this.image)
    this.fileDirectory = this.image.fileDirectory
    // settings from fileDirectory
    this.colorMap = this.fileDirectory.ColorMap
    this.photometricInterpretation = this.fileDirectory.PhotometricInterpretation
    this.samplesPerPixel = this.fileDirectory.SamplesPerPixel
    this.bitsPerSample = this.fileDirectory.BitsPerSample

    if (_.isNil(this.rasters)) {
      if (!inWorker) {
        this.rasters = await new Promise(resolve => {
          ipcRenderer.once('read_raster_completed_' + this.id, (event, result) => {
            resolve(result.rasters)
          })
          ipcRenderer.send('read_raster', {id: this.id, filePath: this.filePath})
        })
      } else {
        this.rasters = await this.image.readRasters()
      }
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
      this.globalOpacity = this._configuration.globalOpacity
      this.enableGlobalOpacity = this._configuration.enableGlobalOpacity
      // available bands to assign
      this.bandOptions = this._configuration.bandOptions
    } else {
      this.enableGlobalNoDataValue = false
      this.globalNoDataValue = this.image.getGDALNoData()
      if (this.globalNoDataValue !== null) {
        this.enableGlobalNoDataValue = true
      }
      this.enableGlobalOpacity = false
      this.globalOpacity = 100.0
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
        // let band = this.ds[i]
        let name = 'Band ' + i
        // if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) !== 0) {
        //   name += ' (' + band.colorInterpretation + ')'
        // }
        let min = /*band.minimum ||*/0
        let max = /*band.maximum || */GeoTiffLayer.getMaxForDataType(this.bitsPerSample[i])
        this.bandOptions.push({
          value: i,
          name: name,
          min,
          max
        })
      }

      // determine initial rendering method
      if (this.photometricInterpretation === 3) {
        this.renderingMethod = 2
        // this is the default
        this.paletteBand = 1

        if (this.samplesPerPixel > 1) {
          this.alphaBand = 2
        }
        // for (let i = 1; i <= this.ds.bands.count(); i++) {
        //   let band = this.ds.bands.get(i)
        //   if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 2) {
        //     this.paletteBand = i
        //   } else if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 6) {
        //     let prevAlphaBand = this.alphaBand
        //     this.alphaBand = i
        //     if (this.paletteBand === this.alphaBand) {
        //       this.paletteBand = prevAlphaBand
        //     }
        //   }
        // }
      } else if (this.samplesPerPixel >= 3 || this.photometricInterpretation === 2) {
        this.renderingMethod = 1
        // this is the default
        this.redBand = 1
        this.greenBand = 2
        this.blueBand = 3
        if (this.samplesPerPixel > 3) {
          this.alphaBand = 4
        }
        // // check if these bands have a color interp assigned, if so, reorder appropriately
        // for (let i = 1; i <= this.ds.bands.count(); i++) {
        //   let band = this.ds.bands.get(i)
        //   if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 3) {
        //     let prevRedBand = this.redBand
        //     this.redBand = i
        //     if (this.greenBand === this.redBand) {
        //       this.greenBand = prevRedBand
        //     } else if (this.blueBand === this.redBand) {
        //       this.blueBand = prevRedBand
        //     }
        //   } else if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 4) {
        //     let prevGreenBand = this.greenBand
        //     this.greenBand = i
        //     if (this.redBand === this.greenBand) {
        //       this.redBand = prevGreenBand
        //     } else if (this.blueBand === this.greenBand) {
        //       this.blueBand = prevGreenBand
        //     }
        //   } else if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 5) {
        //     let prevBlueBand = this.blueBand
        //     this.blueBand = i
        //     if (this.redBand === this.blueBand) {
        //       this.redBand = prevBlueBand
        //     } else if (this.greenBand === this.blueBand) {
        //       this.greenBand = prevBlueBand
        //     }
        //   } else if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 6) {
        //     let prevAlphaBand = this.alphaBand
        //     this.alphaBand = i
        //     if (this.redBand === this.alphaBand) {
        //       this.redBand = prevAlphaBand
        //     } else if (this.greenBand === this.alphaBand) {
        //       this.greenBand = prevAlphaBand
        //     } else if (this.blueBand === this.alphaBand) {
        //       this.blueBand = prevAlphaBand
        //     }
        //   }
        // }
        this.redBandMin = this.bandOptions[this.redBand].min
        this.redBandMax = this.bandOptions[this.redBand].max
        this.greenBandMin = this.bandOptions[this.greenBand].min
        this.greenBandMax = this.bandOptions[this.greenBand].max
        this.blueBandMin = this.bandOptions[this.blueBand].min
        this.blueBandMax = this.bandOptions[this.blueBand].max
      } else if (this.samplesPerPixel === 1 || this.photometricInterpretation <= 1) {
        this.renderingMethod = 0
        this.grayScaleColorGradient = this.photometricInterpretation
        // this is the default
        this.grayBand = 1
        // for (let i = 1; i <= this.ds.bands.count(); i++) {
        //   let band = this.ds.bands.get(i)
        //   if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 1) {
        //     this.grayBand = i
        //   } else if (GeoTiffLayer.getColorInterpretationNum(band.colorInterpretation) === 6) {
        //     let prevAlphaBand = this.alphaBand
        //     this.alphaBand = i
        //     if (this.grayBand === this.alphaBand) {
        //       this.grayBand = prevAlphaBand
        //     }
        //   }
        // }
        this.grayBandMin = this.bandOptions[this.grayBand].min
        this.grayBandMax = this.bandOptions[this.grayBand].max
      } else {
        this.photometricInterpretation = 1
      }
      // should we enable stretch to min max by default
      // let shouldStretch = true
      // for (let i = 1; i <= this.ds.bands.count(); i++) {
      //   let band = this.ds.bands.get(i)
      //   if (!band.minimum || !band.maximum) {
      //     shouldStretch = true
      //   }
      // }
      this.stretchToMinMax = false
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
        globalOpacity: this.globalOpacity,
        enableGlobalOpacity: this.enableGlobalOpacity
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
    const transform = proj4(epsgString)

    const minCoord = transform.inverse([bbox[0], bbox[1]])
    const maxCoord = transform.inverse([bbox[2], bbox[3]])

    this._configuration.extent = [minCoord[0], minCoord[1], maxCoord[0], maxCoord[1]]
    return this._configuration.extent
  }

  async renderTile (coords, tileCanvas, done) {
    return this.renderer.renderTile(coords, tileCanvas, done)
  }
}
