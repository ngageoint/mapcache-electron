/* eslint-disable no-empty */
import isNil from 'lodash/isNil'
import { METERS_PER_UNIT } from '../units/units'
import { generateUrlWithQueryParams, getBaseUrlAndQueryParams } from '../../network/URLUtilities'
import {
  EPSG, COLON_DELIMITER,
  WEB_MERCATOR, WEB_MERCATOR_CODE,
  WORLD_GEODETIC_SYSTEM, WORLD_GEODETIC_SYSTEM_CODE,
  WORLD_GEODETIC_SYSTEM_CRS, WORLD_GEODETIC_SYSTEM_CRS_CODE
} from '../../projection/ProjectionConstants'

const supportedImageFormats = ['image/png', 'image/pbf', 'image/jpg', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/bmp', 'image/webp']

const WMTS_TAGS = {
  CAPABILITIES: 'Capabilities',
  CONTENTS: 'Contents',
  TITLE: 'ows:Title',
  ABSTRACT: 'ows:Abstract',
  SERVICE_IDENTIFICATION: 'ows:ServiceIdentification',
  SERVICE_TYPE: 'ows:ServiceType',
  SERVICE_TYPE_VERSION: 'ows:ServiceTypeVersion',
  SERVICE_PROVIDER: 'ows:ServiceProvider',
  PROVIDER_NAME: 'ows:ProviderName',
  PROVIDER_SITE: 'ows:ProviderSite',
  SERVICE_CONTACT: 'ows:ServiceContact',
  INDIVIDUAL_NAME: 'ows:IndividualName',
  POSITION_NAME: 'ows:PositionName',
  CONTACT_INFO: 'ows:ContactInfo',
  PHONE: 'ows:Phone',
  VOICE: 'ows:Voice',
  FACSIMILE: 'ows:Facsimile',
  ADDRESS: 'ows:Address',
  UNDERSCORE: '_',
  ADMINISTRATIVE_AREA: 'ows:AdministrativeArea',
  DELIVERY_POINT: 'ows:DeliveryPoint',
  CITY: 'ows:City',
  POSTAL_CODE: 'ows:PostalCode',
  COUNTRY: 'ows:Country',
  ELECTRONIC_MAIL_ADDRESS: 'ows:ElectronMailAddress',
  LAYER: 'Layer',
  WGS84_BOUNDING_BOX: 'ows:WGS84BoundingBox',
  LOWER_CORNER: 'ows:LowerCorner',
  UPPER_CORNER: 'ows:UpperCorner',
  IDENTIFIER: 'ows:Identifier',
  FORMAT: 'Format',
  TILE_MATRIX_SET_LINK: 'TileMatrixSetLink',
  TILE_MATRIX_SET: 'TileMatrixSet',
  TILE_MATRIX_SET_LIMITS: 'TileMatrixSetLimits',
  TILE_MATRIX: 'TileMatrix',
  TILE_MATRIX_LIMITS: 'TileMatrixLimits',
  MIN_TILE_ROW: 'MinTileRow',
  MAX_TILE_ROW: 'MaxTileRow',
  MIN_TILE_COL: 'MinTileCol',
  MAX_TILE_COL: 'MaxTileCol',
  SUPPORTED_CRS: 'ows:SupportedCRS',
  BOUNDING_BOX: 'ows:BoundingBox',
  SCALE_DENOMINATOR: 'ScaleDenominator',
  TOP_LEFT_CORNER: 'TopLeftCorner',
  TILE_WIDTH: 'TileWidth',
  TILE_HEIGHT: 'TileHeight',
  MATRIX_WIDTH: 'MatrixWidth',
  MATRIX_HEIGHT: 'MatrixHeight',
  DOLLAR_SIGN: '$',
  CRS: 'crs',
  RESOURCE_URL: 'ResourceURL',
  RESOURCE_TYPE: 'resourceType',
  RESOURCE_TEMPLATE: 'template',
  RESOURCE_FORMAT: 'format',
  STYLE: 'Style',
  IS_DEFAULT: 'isDefault'
}

function getServiceIdentification (capabilities) {
  let serviceIdentification
  const serviceId = capabilities[WMTS_TAGS.SERVICE_IDENTIFICATION] ? capabilities[WMTS_TAGS.SERVICE_IDENTIFICATION][0] : undefined
  if (!isNil(serviceId)) {
    serviceIdentification = {}
    serviceIdentification.title = serviceId[WMTS_TAGS.TITLE] ? serviceId[WMTS_TAGS.TITLE][0] : ''
    serviceIdentification.abstract = serviceId[WMTS_TAGS.ABSTRACT] ? serviceId[WMTS_TAGS.ABSTRACT][0] : ''
    serviceIdentification.type = serviceId[WMTS_TAGS.SERVICE_TYPE] ? serviceId[WMTS_TAGS.SERVICE_TYPE][0] : ''
    serviceIdentification.version = serviceId[WMTS_TAGS.SERVICE_TYPE_VERSION] ? serviceId[WMTS_TAGS.SERVICE_TYPE_VERSION][0] : ''
  }
  return serviceIdentification
}

function getPhone (contactInfo) {
  let phone
  const p = contactInfo[WMTS_TAGS.PHONE] ? contactInfo[WMTS_TAGS.PHONE][0] : undefined
  if (!isNil(p)) {
    phone = {}
    phone.voice = p[WMTS_TAGS.VOICE] ? p[WMTS_TAGS.VOICE][0] : ''
    phone.facsimile = p[WMTS_TAGS.FACSIMILE] ? p[WMTS_TAGS.FACSIMILE][0] : ''
  }
  return phone
}

function getAddress (contactInfo) {
  let address
  const a = contactInfo[WMTS_TAGS.ADDRESS] ? contactInfo[WMTS_TAGS.ADDRESS][0] : undefined
  if (!isNil(a)) {
    address = {}
    address._ = a[WMTS_TAGS.UNDERSCORE] ? a[WMTS_TAGS.UNDERSCORE][0] : ''
    address.deliveryPoint = a[WMTS_TAGS.DELIVERY_POINT] ? a[WMTS_TAGS.DELIVERY_POINT][0] : ''
    address.city = a[WMTS_TAGS.CITY] ? a[WMTS_TAGS.CITY][0] : ''
    address.administrativeArea = a[WMTS_TAGS.ADMINISTRATIVE_AREA] ? a[WMTS_TAGS.ADMINISTRATIVE_AREA][0] : ''
    address.postalCode = a[WMTS_TAGS.POSTAL_CODE] ? a[WMTS_TAGS.POSTAL_CODE][0] : ''
    address.country = a[WMTS_TAGS.COUNTRY] ? a[WMTS_TAGS.COUNTRY][0] : ''
    address.email = a[WMTS_TAGS.ELECTRONIC_MAIL_ADDRESS] ? a[WMTS_TAGS.ELECTRONIC_MAIL_ADDRESS][0] : ''
  }
  return address
}

function getContactInfo (serviceContact) {
  let contactInfo
  const cI = serviceContact[WMTS_TAGS.CONTACT_INFO] ? serviceContact[WMTS_TAGS.CONTACT_INFO][0] : undefined
  if (!isNil(cI)) {
    contactInfo = {}
    contactInfo.phone = getPhone(contactInfo)
    contactInfo.address = getAddress(contactInfo)
  }
  return contactInfo
}

function getServiceContact (serviceProvider) {
  let serviceContact
  const sC = serviceProvider[WMTS_TAGS.SERVICE_CONTACT] ? serviceProvider[WMTS_TAGS.SERVICE_CONTACT][0] : undefined
  if (!isNil(sC)) {
    serviceContact = {}
    serviceContact.individualName = sC[WMTS_TAGS.INDIVIDUAL_NAME] ? sC[WMTS_TAGS.INDIVIDUAL_NAME][0] : ''
    serviceContact.positionName = sC[WMTS_TAGS.POSITION_NAME] ? sC[WMTS_TAGS.POSITION_NAME][0] : ''
    serviceContact.contactInfo = getContactInfo(sC)
  }
  return serviceContact
}

function getServiceProvider (capabilities) {
  let serviceProvider
  const service = capabilities[WMTS_TAGS.SERVICE_PROVIDER] ? capabilities[WMTS_TAGS.SERVICE_PROVIDER][0] : undefined
  if (!isNil(service)) {
    serviceProvider = {}
    serviceProvider.providerName = service[WMTS_TAGS.PROVIDER_NAME] ? service[WMTS_TAGS.PROVIDER_NAME][0] : ''
    try {
      serviceProvider.providerSite = service[WMTS_TAGS.PROVIDER_SITE] ? service[WMTS_TAGS.PROVIDER_SITE][0][WMTS_TAGS.DOLLAR_SIGN]['xlink:href'] : ''
    } catch (e) {
    }
    serviceProvider.serviceContact = getServiceContact(service)
  }
  return serviceProvider
}

function getBounds (layer) {
  let bounds
  let b = layer[WMTS_TAGS.WGS84_BOUNDING_BOX] ? layer[WMTS_TAGS.WGS84_BOUNDING_BOX][0] : undefined
  if (!isNil(b)) {
    bounds = [-180, -90, 180, 90]
    const lowerCorner = (b[WMTS_TAGS.LOWER_CORNER] ? b[WMTS_TAGS.LOWER_CORNER][0] : '-180.0 -90.0').split(' ')
    const upperCorner = (b[WMTS_TAGS.UPPER_CORNER] ? b[WMTS_TAGS.UPPER_CORNER][0] : '180.0 90.0').split(' ')
    bounds[0] = parseFloat(lowerCorner[0])
    bounds[1] = parseFloat(lowerCorner[1])
    bounds[2] = parseFloat(upperCorner[0])
    bounds[3] = parseFloat(upperCorner[1])
  }
  return bounds
}

function getTileMatrixSetLimits (limits) {
  let limitMap = {}
  if (limits != null && limits.length > 0) {
    const tileMatrixLimits = limits[0][WMTS_TAGS.TILE_MATRIX_LIMITS]
    for (let i = 0; i < tileMatrixLimits.length; i++) {
      const tileMatrixLimit = tileMatrixLimits[i]
      limitMap[tileMatrixLimit[WMTS_TAGS.TILE_MATRIX][0]] = {
        minTileRow: parseInt(tileMatrixLimit[WMTS_TAGS.MIN_TILE_ROW][0]),
        maxTileRow: parseInt(tileMatrixLimit[WMTS_TAGS.MAX_TILE_ROW][0]),
        minTileCol: parseInt(tileMatrixLimit[WMTS_TAGS.MIN_TILE_COL][0]),
        maxTileCol: parseInt(tileMatrixLimit[WMTS_TAGS.MAX_TILE_COL][0]),
      }
    }
  }

  return limitMap
}

function getSupportedTileMatrixSets (l) {
  const tmsList = []
  const tileMatrixSets = l[WMTS_TAGS.TILE_MATRIX_SET_LINK] ? l[WMTS_TAGS.TILE_MATRIX_SET_LINK] : []
  for (let i = 0; i < tileMatrixSets.length; i++) {
    const tileMatrixSet = tileMatrixSets[i]
    if (tileMatrixSet[WMTS_TAGS.TILE_MATRIX_SET]) {
      tmsList.push({
        identifier: tileMatrixSet[WMTS_TAGS.TILE_MATRIX_SET][0],
        limits: getTileMatrixSetLimits(tileMatrixSet[WMTS_TAGS.TILE_MATRIX_SET_LIMITS])
      })
    }
  }
  return tmsList
}

function getBoundingBox (set) {
  let boundingBox
  let boundingBoxCRS
  const bbox = set[WMTS_TAGS.BOUNDING_BOX] ? set[WMTS_TAGS.BOUNDING_BOX][0] : ''
  if (bbox != null) {
    if (bbox[WMTS_TAGS.DOLLAR_SIGN] && bbox[WMTS_TAGS.DOLLAR_SIGN][WMTS_TAGS.CRS]) {
      boundingBoxCRS = bbox[WMTS_TAGS.DOLLAR_SIGN][WMTS_TAGS.CRS]
    }
    if (bbox[WMTS_TAGS.LOWER_CORNER] && bbox[WMTS_TAGS.UPPER_CORNER]) {
      boundingBox = [-180, -90, 180, 90]
      const lowerCorner = (bbox[WMTS_TAGS.LOWER_CORNER] ? bbox[WMTS_TAGS.LOWER_CORNER][0] : '-180.0 -90.0').split(' ')
      const upperCorner = (bbox[WMTS_TAGS.UPPER_CORNER] ? bbox[WMTS_TAGS.UPPER_CORNER][0] : '180.0 90.0').split(' ')
      boundingBox[0] = parseFloat(lowerCorner[0])
      boundingBox[1] = parseFloat(lowerCorner[1])
      boundingBox[2] = parseFloat(upperCorner[0])
      boundingBox[3] = parseFloat(upperCorner[1])
    }
  }
  return { boundingBox, boundingBoxCRS }
}

function convertCRSToEPSGCode (crs) {
  let epsgString
  if (crs != null && crs.toUpperCase().indexOf(EPSG) !== -1) {
    epsgString = EPSG + crs.substring(crs.lastIndexOf(COLON_DELIMITER))
  }
  return epsgString
}

function getEPSGCode (crs) {
  let epsgCode
  if (crs != null && crs.toUpperCase().indexOf(EPSG) !== -1) {
    epsgCode = parseInt(crs.substring(crs.lastIndexOf(COLON_DELIMITER) + 1))
  }
  return epsgCode
}

function getTileMatrix (tileMatrixSet, crs) {
  let tileMatrix = []
  const tm = tileMatrixSet[WMTS_TAGS.TILE_MATRIX] ? tileMatrixSet[WMTS_TAGS.TILE_MATRIX] : []
  for (let i = 0; i < tm.length; i++) {
    const matrix = tm[i]
    const identifier = matrix[WMTS_TAGS.IDENTIFIER] ? matrix[WMTS_TAGS.IDENTIFIER][0] : ''
    const topLeftCorner = matrix[WMTS_TAGS.TOP_LEFT_CORNER] ? matrix[WMTS_TAGS.TOP_LEFT_CORNER][0].split(' ').map(val => parseFloat(val)) : [-1, -1]
    const tM = {
      identifier,
      scaleDenominator: matrix[WMTS_TAGS.SCALE_DENOMINATOR] ? parseFloat(matrix[WMTS_TAGS.SCALE_DENOMINATOR][0]) : -1,
      tileMatrixMinX: Math.min(topLeftCorner[0], topLeftCorner[1]),
      tileMatrixMaxY: Math.max(topLeftCorner[0], topLeftCorner[1]),
      tileWidth: matrix[WMTS_TAGS.TILE_WIDTH] ? parseFloat(matrix[WMTS_TAGS.TILE_WIDTH][0]) : -1,
      tileHeight: matrix[WMTS_TAGS.TILE_HEIGHT] ? parseFloat(matrix[WMTS_TAGS.TILE_HEIGHT][0]) : -1,
      matrixWidth: matrix[WMTS_TAGS.MATRIX_WIDTH] ? parseInt(matrix[WMTS_TAGS.MATRIX_WIDTH][0]) : -1,
      matrixHeight: matrix[WMTS_TAGS.MATRIX_HEIGHT] ? parseInt(matrix[WMTS_TAGS.MATRIX_HEIGHT][0]) : -1,
    }
    const units = window.mapcache.getUnits(convertCRSToEPSGCode(crs))
    const metersPerPixel = window.mapcache.getMetersPerUnit(convertCRSToEPSGCode(crs)) || METERS_PER_UNIT[units] || 1.0

    tM.pixelSpan = tM.scaleDenominator * 0.00028 / metersPerPixel
    tM.tileSpanX = tM.tileWidth * tM.pixelSpan
    tM.tileSpanY = tM.tileHeight * tM.pixelSpan
    tM.tileMatrixMaxX = tM.tileMatrixMinX + tM.tileSpanX * tM.matrixWidth
    tM.tileMatrixMinY = tM.tileMatrixMaxY - tM.tileSpanY * tM.matrixHeight
    tileMatrix.push(tM)
  }
  return tileMatrix
}

function getTileMatrixSet (capabilities) {
  let tileMatrixSets = []
  const contents = capabilities[WMTS_TAGS.CONTENTS] ? capabilities[WMTS_TAGS.CONTENTS][0] : undefined
  if (!isNil(contents)) {
    const tileMs = contents[WMTS_TAGS.TILE_MATRIX_SET] ? contents[WMTS_TAGS.TILE_MATRIX_SET] : []
    for (let i = 0; i < tileMs.length; i++) {
      const set = tileMs[i]
      const tileMatrixSet = {}
      tileMatrixSet.identifier = set[WMTS_TAGS.IDENTIFIER] ? set[WMTS_TAGS.IDENTIFIER][0] : ''
      tileMatrixSet.supportedCRS = set[WMTS_TAGS.SUPPORTED_CRS] ? set[WMTS_TAGS.SUPPORTED_CRS][0] : ''
      const { boundingBox, boundingBoxCRS } = getBoundingBox(set)
      if (boundingBox != null && boundingBoxCRS != null) {
        tileMatrixSet.boundingBox = boundingBox
        tileMatrixSet.boundingBoxCRS = boundingBoxCRS
      }
      tileMatrixSet.tileMatrix = getTileMatrix(set, tileMatrixSet.supportedCRS || tileMatrixSet.boundingBoxCRS)
      tileMatrixSet.srs = convertCRSToEPSGCode(tileMatrixSet.supportedCRS || tileMatrixSet.boundingBoxCRS)
      tileMatrixSets.push(tileMatrixSet)
    }
  }
  return tileMatrixSets
}

function getResourceURL (layer, isHttps = false) {
  let resource
  if (layer[WMTS_TAGS.RESOURCE_URL] != null) {
    const r = layer[WMTS_TAGS.RESOURCE_URL][0][WMTS_TAGS.DOLLAR_SIGN]
    resource = {
      format: r[WMTS_TAGS.RESOURCE_FORMAT],
      type: r[WMTS_TAGS.RESOURCE_TYPE],
      template: r[WMTS_TAGS.RESOURCE_TEMPLATE],
    }
    if (isHttps && resource.template && resource.template.indexOf('https') === -1) {
      resource.template = resource.template.replace('http', 'https')
    }
  }
  return resource
}

function getDefaultStyleIdentifier (layer) {
  let styleIdentifier = 'default'
  const styles = layer['Style'] || []
  for (let i = 0; i < styles.length; i++) {
    const style = styles[i]
    if (style[WMTS_TAGS.DOLLAR_SIGN] && style[WMTS_TAGS.DOLLAR_SIGN][WMTS_TAGS.IS_DEFAULT] === 'true') {
      styleIdentifier = style[WMTS_TAGS.IDENTIFIER][0]
    }
  }
  return styleIdentifier
}

function getLayers (capabilities, isHttps) {
  const serviceLayers = []
  const contents = capabilities[WMTS_TAGS.CONTENTS] ? capabilities[WMTS_TAGS.CONTENTS][0] : undefined
  if (!isNil(contents)) {
    const layers = contents[WMTS_TAGS.LAYER]
    for (let i = 0; i < layers.length; i++) {
      const l = layers[i]
      const layer = {}
      layer.title = l[WMTS_TAGS.TITLE] ? l[WMTS_TAGS.TITLE][0] : ''
      layer.identifier = l[WMTS_TAGS.IDENTIFIER] ? l[WMTS_TAGS.IDENTIFIER][0] : ''
      layer.extent = getBounds(l)
      layer.format = getRecommendedFormat(l[WMTS_TAGS.FORMAT] ? l[WMTS_TAGS.FORMAT] : ['image/png'])
      layer.tileMatrixSets = getSupportedTileMatrixSets(l)
      layer.resource = getResourceURL(l, isHttps)
      layer.style = getDefaultStyleIdentifier(l)
      layer.wmts = true
      serviceLayers.push(layer)
    }
  }
  return serviceLayers
}

function getWMTSInfo (json, isHttps) {
  let wmtsInfo = {}
  try {
    let capabilities
    if (!isNil(json[WMTS_TAGS.CAPABILITIES])) {
      capabilities = json[WMTS_TAGS.CAPABILITIES]
      wmtsInfo.serviceIdentification = getServiceIdentification(capabilities)
      wmtsInfo.serviceProvider = getServiceProvider(capabilities)
      wmtsInfo.layers = getLayers(capabilities, isHttps)
      wmtsInfo.tileMatrixSet = getTileMatrixSet(capabilities)
    }
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to process WMTS GetCapabilities.')
  }
  return wmtsInfo
}

/**
 * Recommended format for GetMap is image/png, then image/[jpg|jpeg], then image/gif
 * @param formats
 */
function getRecommendedFormat (formats) {
  let format
  for (let i = 0; i < supportedImageFormats.length; i++) {
    const supportedFormat = supportedImageFormats[i]
    if (formats.indexOf(supportedFormat) !== -1) {
      format = supportedFormat
      break
    }
  }
  return format
}

/**
 * Selects a recommended SRS for MapCache, otherwise, uses the first in the list.
 * @param srsList
 * @param preferredCrsCode
 * @returns {string|*}
 */
function getRecommendedSrs (srsList, preferredCrsCode = WEB_MERCATOR_CODE) {

  const preferredSrsIndex = srsList.findIndex(crs => crs.toUpperCase().endsWith(COLON_DELIMITER + preferredCrsCode))

  const index3857 = srsList.findIndex(crs => crs.toUpperCase().endsWith(COLON_DELIMITER + WEB_MERCATOR_CODE))
  const index4326 = srsList.findIndex(crs => crs.toUpperCase().endsWith(COLON_DELIMITER + WORLD_GEODETIC_SYSTEM_CODE))
  const indexCRS84 = srsList.findIndex(crs => crs.toUpperCase().endsWith(COLON_DELIMITER + WORLD_GEODETIC_SYSTEM_CRS_CODE))
  const epsgIndex = srsList.findIndex(crs => crs.toUpperCase().indexOf(EPSG) !== -1)

  if (preferredSrsIndex !== -1) {
    return srsList[preferredSrsIndex]
  } else if (index3857 !== -1) {
    return srsList[index3857]
  } else if (index4326 !== -1) {
    return srsList[index4326]
  } else if (indexCRS84 !== -1) {
    return srsList[indexCRS84]
  } else if (epsgIndex !== -1) {
    return srsList[epsgIndex]
  } else {
    return srsList[0]
  }
}

/**
 * Selects a recommended SRS for MapCache, otherwise, uses the first in the list.
 * @param srsList
 * @returns {string|*}
 */
function getRecommendedEpsg (srsList) {
  const index3857 = srsList.findIndex(crs => crs.toUpperCase().endsWith(COLON_DELIMITER + WEB_MERCATOR_CODE))
  const index4326 = srsList.findIndex(crs => crs.toUpperCase().endsWith(COLON_DELIMITER + WORLD_GEODETIC_SYSTEM_CODE))
  const indexCRS84 = srsList.findIndex(crs => crs.toUpperCase().endsWith(COLON_DELIMITER + WORLD_GEODETIC_SYSTEM_CRS_CODE))
  const epsgIndex = srsList.findIndex(crs => crs.toUpperCase().indexOf(EPSG) !== -1)
  if (index3857 !== -1) {
    return WEB_MERCATOR
  } else if (index4326 !== -1) {
    return WORLD_GEODETIC_SYSTEM
  } else if (indexCRS84 !== -1) {
    return WORLD_GEODETIC_SYSTEM_CRS
  } else if (epsgIndex !== -1 && srsList[epsgIndex].lastIndexOf(COLON_DELIMITER) !== -1) {
    return EPSG + srsList[epsgIndex].substring(srsList[epsgIndex].lastIndexOf(COLON_DELIMITER))
  } else {
    return srsList[0]
  }
}

// get the GetCapabilities URL
function getWMTSCapabilitiesURL (wmtsUrl) {
  let { baseUrl, queryParams } = getBaseUrlAndQueryParams(wmtsUrl)
  queryParams['request'] = 'GetCapabilities'
  queryParams['version'] = '1.0.0'
  queryParams['service'] = 'WMTS'
  return generateUrlWithQueryParams(baseUrl, queryParams)
}

function getBaseURL (wmtsUrl) {
  let { baseUrl, queryParams } = getBaseUrlAndQueryParams(wmtsUrl)
  if (queryParams['request']) {
    delete queryParams['request']
  }
  if (queryParams['service']) {
    delete queryParams['service']
  }
  if (queryParams['version']) {
    delete queryParams['version']
  }
  return generateUrlWithQueryParams(baseUrl, queryParams)
}


function getTileRequestURL (wmtsUrl, layer, format, tileMatrixSet, tileMatrix, tileRow, tileCol, style) {
  if (wmtsUrl.indexOf('{TileMatrix}') !== -1) {
    return wmtsUrl
      .replace('{style}', style)
      .replace('{Style}', style)
      .replace('{TileMatrixSet}', tileMatrixSet)
      .replace('{TileMatrix}', tileMatrix)
      .replace('{TileRow}', tileRow)
      .replace('{TileCol}', tileCol)
  } else {
    let { baseUrl, queryParams } = getBaseUrlAndQueryParams(wmtsUrl)
    queryParams['service'] = 'WMTS'
    queryParams['request'] = 'GetTile'
    queryParams['version'] = '1.0.0'
    queryParams['layer'] = layer
    queryParams['style'] = style
    queryParams['format'] = format
    queryParams['tileMatrixSet'] = tileMatrixSet
    queryParams['tileMatrix'] = tileMatrix
    queryParams['tileRow'] = tileRow
    queryParams['tileCol'] = tileCol
    return generateUrlWithQueryParams(baseUrl, queryParams)
  }
}

const epsilon = 0.000001

/**
 * Determines the tile indices of a tile matrix given a bounding box
 * @param tileMatrix
 * @param boundingBox
 * @return {{tileMinCol: number, tileMaxRow: number, tileMaxCol: number, tileMinRow: number}}
 */
function getTileIndices (tileMatrix, boundingBox) {
  // to compensate for floating point computation inaccuracies
  let tileMinCol = Math.floor((boundingBox.minLon - tileMatrix.tileMatrixMinX) / tileMatrix.tileSpanX + epsilon)
  let tileMaxCol = Math.floor((boundingBox.maxLon - tileMatrix.tileMatrixMinX) / tileMatrix.tileSpanX - epsilon)
  let tileMinRow = Math.floor((tileMatrix.tileMatrixMaxY - boundingBox.maxLat) / tileMatrix.tileSpanY + epsilon)
  let tileMaxRow = Math.floor((tileMatrix.tileMatrixMaxY - boundingBox.minLat) / tileMatrix.tileSpanY - epsilon)

  // to avoid requesting out-of-range tiles
  if (tileMinCol < 0) {
    tileMinCol = 0
  }
  if (tileMaxCol >= tileMatrix.matrixWidth) {
    tileMaxCol = tileMatrix.matrixWidth - 1
  }
  if (tileMinRow < 0) {
    tileMinRow = 0
  }
  if (tileMaxRow >= tileMatrix.matrixHeight) {
    tileMaxRow = tileMatrix.matrixHeight - 1
  }
  return {
    tileMinCol,
    tileMaxCol,
    tileMinRow,
    tileMaxRow
  }
}

function getBoundingBoxFromIndices (tileMatrix, tileRow, tileCol) {
  const leftX = tileCol * tileMatrix.tileSpanX + tileMatrix.tileMatrixMinX
  const upperY = tileMatrix.tileMatrixMaxY - tileRow * tileMatrix.tileSpanY
  const rightX = (tileCol + 1) * tileMatrix.tileSpanX + tileMatrix.tileMatrixMinX
  const lowerY = tileMatrix.tileMatrixMaxY - (tileRow + 1) * tileMatrix.tileSpanY
  return [leftX, lowerY, rightX, upperY]
}


export {
  supportedImageFormats,
  getWMTSCapabilitiesURL,
  getBaseURL,
  getRecommendedFormat,
  getWMTSInfo,
  getTileRequestURL,
  getRecommendedSrs,
  getRecommendedEpsg,
  getTileIndices,
  getBoundingBoxFromIndices,
  convertCRSToEPSGCode,
  getEPSGCode
}
