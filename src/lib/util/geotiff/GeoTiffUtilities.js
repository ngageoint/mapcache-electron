import isNil from 'lodash/isNil'
import { slice } from '../file/FileUtilities'
import { WEB_MERCATOR_CODE } from '../../projection/ProjectionConstants'

const MAX_BYTE_VALUE = 255

async function getGeoTIFF (filePath) {
  return (async () => {
    const { fromFile } = await import('geotiff');

    return fromFile(filePath)
  })();
}

function getMaxForDataType (bitsPerSample) {
  let max = MAX_BYTE_VALUE
  if (bitsPerSample === 16) {
    max = 65535
  }
  return max
}

function getModelTypeName (modelTypeCode) {
  let modelTypeName
  switch (modelTypeCode) {
    case 0:
      modelTypeName = 'undefined'
      break
    case 1:
      modelTypeName = 'ModelTypeProjected'
      break
    case 2:
      modelTypeName = 'ModelTypeGeographic'
      break
    case 3:
      modelTypeName = 'ModelTypeGeocentric'
      break
    case 32767:
      modelTypeName = 'user-defined'
      break
    default:
      if (modelTypeCode < 32767) {
        modelTypeName = 'GeoTIFF Reserved Codes'
      } else if (modelTypeCode > 32767) {
        modelTypeName = 'Private User Implementations'
      }
      break
  }
  return modelTypeName
}

async function readRasters (filePath) {
  const geotiff = await getGeoTIFF(filePath)
  const image = await geotiff.getImage()
  return await image.readRasters()
}

/**
 * Determine EPSG code of geotiff
 * @param image
 */
function getCRSForGeoTiff (image) {
  let crs = 0
  if (isNil(image.getGeoKeys())) {
    throw new Error('Unable to determine CRS for GeoTIFF. Missing GeoKeys.')
  }
  if (Object.prototype.hasOwnProperty.call(image.getGeoKeys(), 'GTModelTypeGeoKey') === false) {
    crs = 0
  } else if (getModelTypeName(image.getGeoKeys().GTModelTypeGeoKey) === 'ModelTypeGeographic' && Object.prototype.hasOwnProperty.call(image.getGeoKeys(), 'GeographicTypeGeoKey')) {
    crs = image.getGeoKeys()['GeographicTypeGeoKey']
  } else {
    if (getModelTypeName(image.getGeoKeys().GTModelTypeGeoKey) === 'ModelTypeProjected' && Object.prototype.hasOwnProperty.call(image.getGeoKeys(), 'ProjectedCSTypeGeoKey')) {
      crs = image.getGeoKeys()['ProjectedCSTypeGeoKey']
    } else if (getModelTypeName(image.getGeoKeys().GTModelTypeGeoKey) === 'user-defined') {
      if (Object.prototype.hasOwnProperty.call(image.getGeoKeys(), 'ProjectedCSTypeGeoKey')) {
        crs = image.getGeoKeys()['ProjectedCSTypeGeoKey']
      } else if (Object.prototype.hasOwnProperty.call(image.getGeoKeys(), 'GeographicTypeGeoKey')) {
        crs = image.getGeoKeys()['GeographicTypeGeoKey']
      } else if (Object.prototype.hasOwnProperty.call(image.getGeoKeys(), 'GTCitationGeoKey') && image.getGeoKeys()['GTCitationGeoKey'].search("WGS_1984_Web_Mercator_Auxiliary_Sphere") !== -1) {
        crs = WEB_MERCATOR_CODE
      }
    }
  }
  return crs
}

/**
 * Gets DataView to handle reading in binary data
 * @param sampleIndex
 * @param sampleFormat
 * @param bitsPerSample
 * @returns {((byteOffset: number) => number)|((byteOffset: number, littleEndian?: boolean) => number)}
 */
function getReaderForSample (sampleIndex, sampleFormat, bitsPerSample) {
  const format = sampleFormat ? sampleFormat[sampleIndex] : 1
  switch (format) {
    case 1: // unsigned integer data
      switch (bitsPerSample) {
        case 8:
          return DataView.prototype.getUint8
        case 16:
          return DataView.prototype.getUint16
        case 32:
          return DataView.prototype.getUint32
        default:
          break
      }
      break
    case 2: // twos complement signed integer data
      switch (bitsPerSample) {
        case 8:
          return DataView.prototype.getInt8
        case 16:
          return DataView.prototype.getInt16
        case 32:
          return DataView.prototype.getInt32
        default:
          break
      }
      break
    case 3:
      switch (bitsPerSample) {
        case 32:
          return DataView.prototype.getFloat32
        case 64:
          return DataView.prototype.getFloat64
        default:
          break
      }
      break
    default:
      break
  }
  throw Error('Unsupported data format/bitsPerSample')
}

/**
 * Gets a sample across all bands from a file
 * @param fd
 * @param offset
 * @param sampleBytes
 * @param bitsPerSample
 * @param reader
 * @param littleEndian
 * @returns {*}
 */
function getSample (fd, offset = 0, sampleBytes, bitsPerSample, reader, littleEndian) {
  const arrayBuffer = slice(fd, offset, offset + sampleBytes)
  return Object.keys(bitsPerSample).map((sample, i) => {
    return reader.call(arrayBuffer, i, littleEndian)
  })
}

/**
 * Limits the value to the min or max
 * @param value
 * @param min
 * @param max
 * @returns {number}
 */
function stretchValue (value, min, max) {
  let stretchedValue = (value - min) / (max - min) * MAX_BYTE_VALUE
  if (stretchedValue < 0) {
    stretchedValue = 0
  } else if (stretchedValue > MAX_BYTE_VALUE) {
    stretchedValue = MAX_BYTE_VALUE
  }
  return stretchedValue
}

export {
  getMaxForDataType,
  getModelTypeName,
  getCRSForGeoTiff,
  getReaderForSample,
  getSample,
  readRasters,
  stretchValue,
  MAX_BYTE_VALUE,
  getGeoTIFF
}
