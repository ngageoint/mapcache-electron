import jetpack from 'fs-jetpack'
import path from 'path'
import Source from './Source'
import GeoTiffLayer from '../layer/tile/GeoTiffLayer'
import * as GeoTIFF from 'geotiff'
import { getCRSForGeoTiff, getMaxForDataType } from '../util/GeoTiffUtilities'
import fs from 'fs'
import { GEOTIFF } from '../layer/LayerTypes'
import { getConverter } from '../projection/ProjectionUtilities'

export default class GeoTIFFSource extends Source {
  static async getGeoTIFF (filePath) {
    return GeoTIFF.fromFile(filePath)
  }

  static async getImage (geotiff) {
    return geotiff.getImage()
  }

  static closeGeoTIFF (geotiff) {
    geotiff.close()
  }

  static getImageData (image) {
    const imageOrigin = image.getOrigin()
    const imageResolution = image.getResolution()
    const imageWidth = image.getWidth()
    const imageHeight = image.getHeight()
    const tileWidth = image.getTileWidth()
    const tileHeight = image.getTileHeight()
    const srs = getCRSForGeoTiff(image)
    const globalNoDataValue = image.getGDALNoData()
    const littleEndian = image.littleEndian
    const fileDirectory = image.fileDirectory

    return {
      imageOrigin,
      imageResolution,
      imageWidth,
      imageHeight,
      srs,
      littleEndian,
      globalNoDataValue,
      fileDirectory,
      tileWidth,
      tileHeight
    }
  }

  static getFileDirectoryData (fileDirectory) {
    const colorMap = fileDirectory.ColorMap ? new Uint16Array(fileDirectory.ColorMap.buffer) : null
    let photometricInterpretation = fileDirectory.PhotometricInterpretation
    const samplesPerPixel = fileDirectory.SamplesPerPixel
    const bitsPerSample = fileDirectory.BitsPerSample
    const sampleFormat = fileDirectory.SampleFormat
    const bytesPerSample = bitsPerSample ? bitsPerSample.reduce((accumulator, currentValue) => accumulator + currentValue, 0) / 8 : 8

    return {
      colorMap,
      photometricInterpretation,
      samplesPerPixel,
      bitsPerSample,
      sampleFormat,
      bytesPerSample,
    }
  }

  static async createGeoTIFFDataFile (image, rasterFilePath) {
    // read chunks of a raster file at a time and store the decoded data into the data.bin file
    const height = image.getHeight()
    const width = image.getWidth()
    const tileHeight = image.getTileHeight()
    const fd = fs.openSync(rasterFilePath, 'w')
    for (let i = 0; i < height; i = i + tileHeight) {
      const raster = await image.readRasters({
        window: [0, i, width, Math.min(height, (i + tileHeight))],
        interleave: true
      })
      fs.writeSync(fd, raster)
    }
    fs.closeSync(fd)
  }


  /**
   * Creates the GeoTiff layer
   * @param filePath
   * @param name
   * @param id
   * @param directory
   * @param sourceDirectory
   * @returns {Promise<GeoTiffLayer>}
   */
  static async createGeoTiffLayer (filePath, name, id, directory, sourceDirectory) {
    const geotiff = await GeoTIFFSource.getGeoTIFF(filePath)
    const image = await GeoTIFFSource.getImage(geotiff)
    let {
      imageOrigin,
      imageResolution,
      imageWidth,
      imageHeight,
      srs,
      littleEndian,
      globalNoDataValue,
      fileDirectory,
    } = GeoTIFFSource.getImageData(image)

    let {
      colorMap,
      photometricInterpretation,
      samplesPerPixel,
      bitsPerSample,
      sampleFormat,
      bytesPerSample
    } = GeoTIFFSource.getFileDirectoryData(fileDirectory)

    // read chunks of a raster file at a time and store the decoded data into the data.bin file
    const rasterFile = path.join(path.dirname(filePath), 'data.bin')
    await GeoTIFFSource.createGeoTIFFDataFile(image, rasterFile)

    let enableGlobalNoDataValue = false
    if (globalNoDataValue !== null) {
      enableGlobalNoDataValue = true
    }

    let redBand = 0
    let redBandMin, redBandMax
    let greenBand = 0
    let greenBandMin, greenBandMax
    let blueBand = 0
    let blueBandMin, blueBandMax
    let grayBand = 0
    let grayBandMin, grayBandMax
    let paletteBand = 0
    let alphaBand = 0
    let grayScaleColorGradient = 1
    let renderingMethod
    let bandOptions = [{
      value: 0,
      name: 'No band'
    }]
    // setup band options
    for (let i = 1; i <= bitsPerSample.length; i++) {
      let name = 'Band ' + i
      let min = 0
      let max = getMaxForDataType(bitsPerSample[i])
      bandOptions.push({
        value: i,
        name: name,
        min,
        max
      })
    }

    // determine rendering method
    if (photometricInterpretation === 6) {
      renderingMethod = 3
    } else if (photometricInterpretation === 5) {
      renderingMethod = 4
    } else if (photometricInterpretation === 8) {
      renderingMethod = 5
    } else if (photometricInterpretation === 3) {
      renderingMethod = 2
      // this is the default
      paletteBand = 1
      if (samplesPerPixel > 1) {
        alphaBand = 2
      }
    } else if (samplesPerPixel >= 3 || photometricInterpretation === 2) {
      renderingMethod = 1
      // this is the default
      redBand = 1
      greenBand = 2
      blueBand = 3
      if (samplesPerPixel > 3) {
        alphaBand = 4
      }
      redBandMin = bandOptions[redBand].min
      redBandMax = bandOptions[redBand].max
      greenBandMin = bandOptions[greenBand].min
      greenBandMax = bandOptions[greenBand].max
      blueBandMin = bandOptions[blueBand].min
      blueBandMax = bandOptions[blueBand].max
    } else if (samplesPerPixel === 1 || photometricInterpretation <= 1) {
      renderingMethod = 0
      grayScaleColorGradient = photometricInterpretation
      grayBand = 1
      grayBandMin = bandOptions[grayBand].min
      grayBandMax = bandOptions[grayBand].max
    } else {
      photometricInterpretation = 1
    }
    const stretchToMinMax = false

    // determine extent
    const bbox = image.getBoundingBox()
    const epsgString = 'EPSG:' + srs
    const transform = getConverter('EPSG:4326', epsgString)
    const minCoord = transform.inverse([bbox[0], bbox[1]])
    const maxCoord = transform.inverse([bbox[2], bbox[3]])
    const extent = [minCoord[0], minCoord[1], maxCoord[0], maxCoord[1]]

    GeoTIFFSource.closeGeoTIFF(geotiff)

    return new GeoTiffLayer({
      alphaBand: alphaBand,
      bandOptions: bandOptions,
      bitsPerSample: bitsPerSample,
      blueBand: blueBand,
      blueBandMin: blueBandMin,
      blueBandMax: blueBandMax,
      bytesPerSample: bytesPerSample,
      colorMap: colorMap,
      directory: directory,
      enableGlobalNoDataValue: enableGlobalNoDataValue,
      extent: extent,
      filePath: filePath,
      globalNoDataValue: globalNoDataValue,
      grayScaleColorGradient: grayScaleColorGradient,
      grayBand: grayBand,
      grayBandMin: grayBandMin,
      grayBandMax: grayBandMax,
      greenBand: greenBand,
      greenBandMin: greenBandMin,
      greenBandMax: greenBandMax,
      id: id,
      imageHeight: imageHeight,
      imageOrigin: imageOrigin,
      imageResolution: imageResolution,
      imageWidth: imageWidth,
      layerType: GEOTIFF,
      littleEndian: littleEndian,
      name: name,
      paletteBand: paletteBand,
      photometricInterpretation: photometricInterpretation,
      rasterFile: rasterFile,
      redBand: redBand,
      redBandMin: redBandMin,
      redBandMax: redBandMax,
      renderingMethod: renderingMethod,
      sampleFormat: sampleFormat,
      samplesPerPixel: samplesPerPixel,
      sourceDirectory: sourceDirectory,
      sourceLayerName: name,
      srs: srs,
      stretchToMinMax: stretchToMinMax,
      visible: false
    })
  }

  async retrieveLayers () {
    const { layerId, layerDirectory } = this.createLayerDirectory()
    let filePath = path.join(layerDirectory, path.basename(this.filePath))
    await jetpack.copyAsync(this.filePath, filePath)
    const name = path.basename(this.filePath, path.extname(this.filePath))
    const geotiffLayer = await GeoTIFFSource.createGeoTiffLayer(filePath, name, layerId, layerDirectory, this.directory)
    return [geotiffLayer]
  }
}
