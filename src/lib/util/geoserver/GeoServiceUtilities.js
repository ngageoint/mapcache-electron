/* eslint-disable no-empty */
import { generateUrlWithQueryParams, getBaseUrlAndQueryParams } from '../../network/URLUtilities'
import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'
import keys from 'lodash/keys'
import axios from 'axios'
import {
  COLON_DELIMITER,
  WEB_MERCATOR, WEB_MERCATOR_CODE,
  WORLD_GEODETIC_SYSTEM, WORLD_GEODETIC_SYSTEM_CODE,
  WORLD_GEODETIC_SYSTEM_CRS, WORLD_GEODETIC_SYSTEM_CRS_CODE
} from '../../projection/ProjectionConstants'

const WMS_VERSIONS = {
  V1_3_0: '1.3.0',
  V1_1_1: '1.1.1'
}
const WMS_CONSTANTS = {
  CRS: 'crs',
  SRS: 'srs'
}
const WFS_VERSIONS = {
  V1_0_0: '1.0.0',
  V1_1_0: '1.1.0',
  V2_0_0: '2.0.0'
}

const supportedImageFormats = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/bmp', 'image/webp']
const supportedWFSResponseFormats = ['application/json', 'json', 'geojson', 'gml32', 'text/xml; subtype=gml/3.2', 'gml3', 'text/xml; subtype=gml/3.1', 'text/xml; subtype=gml/3.1.1', 'gml2', 'text/xml; subtype=gml/2', 'text/xml; subtype=gml/2.1.2']

function getBoundingBoxForWMSRequest (bbox, version, srs) {
  if (srs.endsWith(COLON_DELIMITER + WORLD_GEODETIC_SYSTEM_CODE) && version === WMS_VERSIONS.V1_3_0) {
    return [bbox.minLat, bbox.minLon, bbox.maxLat, bbox.maxLon].join(',')
  } else {
    return [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat].join(',')
  }
}

function getReferenceSystemNameForWMSRequest (version) {
  let referenceSystemName = WMS_CONSTANTS.SRS
  if (version === WMS_VERSIONS.V1_3_0) {
    referenceSystemName = WMS_CONSTANTS.CRS
  }
  return referenceSystemName
}

function getSRSForWMSLayer (layer, availableSrs) {
  let srs = []
  if (!isNil(layer['CRS'])) {
    srs = layer['CRS']
  } else if (!isNil(layer['SRS'])) {
    srs = layer['SRS']
  }
  return srs.filter(s => isNil(availableSrs.find(aSrs => aSrs === s)))
}

function getBoundingBoxFromWMSLayer (layer) {
  let bbox
  let extent
  try {
    if (!isNil(layer['LatLonBoundingBox'])) {
      bbox = layer['LatLonBoundingBox'][0]['$']
      extent = [Number(bbox['minx']), Number(bbox['miny']), Number(bbox['maxx']), Number(bbox['maxy'])]
    } else if (!isNil(layer['EX_GeographicBoundingBox'])) {
      bbox = layer['EX_GeographicBoundingBox'][0]
      extent = [Number(bbox['westBoundLongitude']), Number(bbox['southBoundLatitude']), Number(bbox['eastBoundLongitude']), Number(bbox['northBoundLatitude'])]
    }
  } catch (e) {
  }
  return extent
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
 * @returns {string|*}
 */
function getRecommendedSrs (srsList) {
  if (srsList.findIndex(crs => crs.toUpperCase().endsWith(COLON_DELIMITER + WEB_MERCATOR_CODE)) !== -1) {
    return WEB_MERCATOR
  } else if (srsList.findIndex(crs => crs.toUpperCase().endsWith(COLON_DELIMITER + WORLD_GEODETIC_SYSTEM_CODE)) !== -1) {
    return WORLD_GEODETIC_SYSTEM
  } else if (srsList.findIndex(crs => crs.toUpperCase().endsWith(COLON_DELIMITER + WORLD_GEODETIC_SYSTEM_CRS_CODE)) !== -1) {
    return WORLD_GEODETIC_SYSTEM_CRS
  } else {
    return srsList[0]
  }
}

/**
 * Gets layers for wms
 * @param layer
 * @param version
 * @param titles
 * @param availableSrs
 * @param parentExtent
 * @returns {*[]}
 */
function getWMSLayers (layer, version, titles = [], availableSrs = [], parentExtent = [-180, -90, 180, 90]) {
  const layers = []
  const layerSrs = availableSrs.slice()
  if (!isNil(layer['Layer'])) {
    for (const l of layer['Layer']) {
      const layerTitles = titles.slice()
      let title = null
      let name = null
      let srs = getSRSForWMSLayer(l, availableSrs)
      try {
        title = layer['Title'][0]
      } catch (e) {
      }
      try {
        name = layer['Name'][0]
      } catch (e) {
      }
      if (isNil(title) || isEmpty(title)) {
        title = name
      }
      if (!isNil(title) && !isEmpty(title)) {
        layerTitles.push(title)
      }
      let extent = getBoundingBoxFromWMSLayer(l) || parentExtent.slice()
      layers.push(...getWMSLayers(l, version, layerTitles, layerSrs.concat(srs), extent))
    }
  } else {
    let extent
    let title
    let name
    const layerTitles = titles.slice()
    const supportedProjections = availableSrs.concat(getSRSForWMSLayer(layer, availableSrs))
    extent = getBoundingBoxFromWMSLayer(layer) || parentExtent.slice()
    try {
      title = layer['Title'][0]
    } catch (e) {
    }
    try {
      name = layer['Name'][0]
    } catch (e) {
    }
    if (!isNil(title) && !isEmpty(title)) {
      layerTitles.push(title)
    } else if (!isNil(name) && !isEmpty(name)) {
      layerTitles.push(name)
    }
    layers.push({
      name,
      title: layerTitles[0],
      subtitles: layerTitles.length > 1 ? layerTitles.slice(1) : [],
      extent,
      wms: true,
      version,
      srs: getRecommendedSrs(supportedProjections),
      supportedProjections: supportedProjections
    })
  }
  return layers
}

// get the GetCapabilities URL
function getGetCapabilitiesURL (wmsUrl, version, service) {
  let { baseUrl, queryParams } = getBaseUrlAndQueryParams(wmsUrl)
  queryParams['request'] = 'GetCapabilities'
  queryParams['version'] = version
  queryParams['service'] = service
  return generateUrlWithQueryParams(baseUrl, queryParams)
}

// get the GetCapabilities URL
function getWFSLayerCountURL (wfsUrl, version, layer) {
  let { baseUrl, queryParams } = getBaseUrlAndQueryParams(wfsUrl)
  if (queryParams['service']) {
    delete queryParams['service']
  }
  queryParams['service'] = 'WFS'
  if (version === WFS_VERSIONS.V2_0_0) {
    queryParams['typeNames'] = layer
  } else {
    queryParams['typeName'] = layer
  }
  queryParams['request'] = 'GetFeature'
  queryParams['resultType'] = 'hits'
  queryParams['version'] = version
  return generateUrlWithQueryParams(baseUrl, queryParams)
}

function getBaseURL (wmsUrl) {
  let { baseUrl, queryParams } = getBaseUrlAndQueryParams(wmsUrl)
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

/**
 * Parses WMS info
 * @param serviceUrl
 * @param json
 * @param version of this WMS GetCapabilities XML
 * @param withCredentials
 */
async function getWMSInfo (serviceUrl, json, version, withCredentials) {
  let isArcGIS = serviceUrl.toLowerCase().indexOf('arcgis') >= 0
  let wmsInfo = {}
  let layers = []
  let format
  try {
    let capabilities
    if (!isNil(json['WMT_MS_Capabilities'])) {
      capabilities = json['WMT_MS_Capabilities']
    } else if (!isNil(json['WMS_Capabilities'])) {
      capabilities = json['WMS_Capabilities']
    }
    // this is an arcgis service if it contains the esri_wms namespace
    if (!isArcGIS && !isNil(capabilities['$']['xmlns:esri_wms'])) {
      isArcGIS = true
    }
    if (!isNil(capabilities)) {
      const service = capabilities['Service'][0]
      if (!isNil(service)) {
        wmsInfo.title = service['Title'] ? service['Title'][0] : ''
        wmsInfo.abstract = service['Abstract'] ? service['Abstract'][0] : ''
        try {
          const contactInformation = service['ContactInformation'][0]['ContactPersonPrimary'][0]
          wmsInfo.contactName = contactInformation['ContactPerson'][0]
          wmsInfo.contactOrg = contactInformation['ContactOrganization'][0]
        } catch (error) {
        }
      }
      const wmsCapability = capabilities['Capability']
      if (!isNil(wmsCapability)) {
        const request = wmsCapability[0]['Request']
        if (!isNil(request)) {
          const getMap = request[0]['GetMap']
          if (!isNil(getMap) && !isNil(getMap[0]['Format'])) {
            format = getRecommendedFormat(getMap[0]['Format'])
          }
        }
        layers.push(...getWMSLayers(wmsCapability[0], version))
      }
    }
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to process WMS GetCapabilities.')
  }

  // if arcgis and none of the layers support 3857 based on get capabilities, see if GetMap automatically handles 3857
  if (isArcGIS && layers.length > 0 && isNil(layers.find(l => l.srs.endsWith(COLON_DELIMITER + WEB_MERCATOR_CODE) || !isNil(l.supportedProjections.find(p => p.endsWith(COLON_DELIMITER + WEB_MERCATOR_CODE)))))) {
    // test if the first layer accepts EPSG:3857
    if (await testGetMapFor3857(serviceUrl, [layers[0].name], version, format, withCredentials)) {
      // ensure each layer has 3857 as an option, and the default to use
      layers.forEach(layer => {
        layer.supportedProjections.push(WEB_MERCATOR)
        layer.srs = WEB_MERCATOR
      })
    }
  }

  wmsInfo.layers = layers
  wmsInfo.format = format
  return wmsInfo
}

/**
 * Attempts a GetMap request for the layer
 * @param wmsUrl
 * @param layers
 * @param version
 * @param format
 * @param withCredentials
 * @returns {Promise<boolean>}
 */
async function testGetMapFor3857 (wmsUrl, layers, version, format, withCredentials) {
  let webMercatorSupport
  const url = getTileRequestURL(wmsUrl, layers, 256, 256, [-20026376.39, -20048966.10, 20026376.39, 20048966.10], WEB_MERCATOR, version, format)
  try {
    const response = await axios({
      url: url,
      withCredentials: withCredentials,
      timeout: 5000
    })
    webMercatorSupport = response.headers['content-type'].startsWith('image')
  } catch (e) {
    webMercatorSupport = false
  }
  return webMercatorSupport
}

function isGeoJSON (fmt) {
  return ['application/json', 'json', 'geojson'].indexOf(fmt.toLowerCase()) !== -1
}

function isGML32 (fmt) {
  return ['gml32', 'text/xml; subtype=gml/3.2'].indexOf(fmt.toLowerCase()) !== -1
}

function isGML3 (fmt) {
  return ['gml3', 'text/xml; subtype=gml/3.1', 'text/xml; subtype=gml/3.1.1'].indexOf(fmt.toLowerCase()) !== -1
}

function isGML2 (fmt) {
  return ['gml2', 'text/xml; subtype=gml/2', 'text/xml; subtype=gml/2.1.2'].indexOf(fmt.toLowerCase()) !== -1
}

function getLayerOutputFormat (layer) {
  let outputFormat = null
  for (let i = 0; i < supportedWFSResponseFormats.length; i++) {
    const fmt = supportedWFSResponseFormats[i]
    outputFormat = layer.outputFormats.find(f => f.toLowerCase() === fmt)
    if (!isNil(outputFormat)) {
      break
    }
  }
  // output format not found in capabilities document, use default for version
  if (isNil(outputFormat)) {
    if (layer.version === WFS_VERSIONS.V1_0_0) {
      outputFormat = 'GML2'
    } else if (layer.version === WFS_VERSIONS.V1_1_0) {
      outputFormat = 'GML3'
    } else {
      outputFormat = 'GML32'
    }
  }
  return outputFormat
}

/**
 * Returns WFS info
 * @param json
 * @param version
 */
function getWFSInfo (json, version) {
  let wfsInfo = {}
  let layers = []
  let outputFormats = ['application/json']
  try {
    if (!isNil(json['WFS_Capabilities'])) {
      try {
        const service = json['WFS_Capabilities']['Service'][0]
        if (!isNil(service)) {
          wfsInfo.title = service['Title'][0]
          const contactInformation = service['ContactInformation'][0]['ContactPersonPrimary'][0]
          wfsInfo.contactName = contactInformation['ContactPerson'][0]
          wfsInfo.contactOrg = contactInformation['ContactOrganization'][0]
          wfsInfo.abstract = service['Abstract'][0]
        }
      } catch (error) {
      }
      try {
        const capability = json['WFS_Capabilities']['Capability'][0]['Request'][0]
        if (!isNil(capability) && !isNil(capability['GetFeature'])) {
          const getFeatureOp = capability['GetFeature'][0]
          if (!isNil(getFeatureOp) && !isNil(getFeatureOp['ResultFormat'])) {
            const featureOutputFormats = keys(getFeatureOp['ResultFormat'][0])
            if (!isNil(featureOutputFormats)) {
              outputFormats = featureOutputFormats.map(key => {
                let mime = ''
                switch (key) {
                  case 'JSON':
                    mime = 'application/json'
                    break
                  case 'GML2':
                    mime = 'GML2'
                    break
                  case 'GML3':
                    mime = 'GML3'
                    break
                  case 'CSV':
                    mime = 'csv'
                    break
                  case 'SHAPE-ZIP':
                    mime = 'shape-zip'
                    break
                  default:
                    break
                }
                return mime
              }).filter(val => val !== '')
            }
          }
        }
      } catch (error) {
      }
      for (const layer of json['WFS_Capabilities']['FeatureTypeList'][0]['FeatureType']) {
        const bbox = layer['LatLongBoundingBox'][0]['$']
        const extent = [Number(bbox['minx']), Number(bbox['miny']), Number(bbox['maxx']), Number(bbox['maxy'])]
        const name = layer['Name'][0]
        let title = !isNil(layer['Title']) ? layer['Title'][0] : name
        if (!isNil(layer['OutputFormats'])) {
          outputFormats = layer['OutputFormats'].map(format => format['Format'][0])
        }
        if (isNil(title) || isEmpty(title)) {
          title = name
        }
        let defaultSRS = !isNil(layer['SRS']) ? layer['SRS'][0] : ''
        const otherSRS = []
        layers.push({
          name,
          title: title,
          subtitles: [],
          extent,
          wfs: true,
          defaultSRS: defaultSRS,
          otherSRS: otherSRS,
          version: version,
          outputFormats
        })
      }
    } else if (!isNil(json['wfs:WFS_Capabilities'])) {
      let outputFormats = ['application/json']
      try {
        const service = json['wfs:WFS_Capabilities']['Service'][0]
        if (!isNil(service)) {
          wfsInfo.title = service['Title'][0]
          const contactInformation = service['ContactInformation'][0]['ContactPersonPrimary'][0]
          wfsInfo.contactName = contactInformation['ContactPerson'][0]
          wfsInfo.contactOrg = contactInformation['ContactOrganization'][0]
          wfsInfo.abstract = service['Abstract'][0]
        }
      } catch (error) {
      }
      try {
        const operationMetadata = json['wfs:WFS_Capabilities']['ows:OperationsMetadata'][0]
        if (!isNil(operationMetadata)) {
          const getFeatureOp = operationMetadata['ows:Operation'].find(operation => operation['$']['name'] === 'GetFeature')
          if (!isNil(getFeatureOp) && !isNil(getFeatureOp['ows:Parameter'])) {
            const featureOutputFormats = getFeatureOp['ows:Parameter'].find(param => param['$']['name'] === 'outputFormat')
            if (!isNil(featureOutputFormats)) {
              outputFormats = featureOutputFormats['ows:AllowedValues'][0]['ows:Value']
            }
          }
        }
      } catch (error) {
      }
      const capabilites = json['wfs:WFS_Capabilities']
      let featureTypeList
      if (!isNil(capabilites['wfs:FeatureTypeList'])) {
        featureTypeList = json['wfs:WFS_Capabilities']['wfs:FeatureTypeList'][0]['wfs:FeatureType']
      } else {
        featureTypeList = json['wfs:WFS_Capabilities']['FeatureTypeList'][0]['FeatureType']
      }
      for (const layer of featureTypeList) {
        const bbox = layer['ows:WGS84BoundingBox'][0]
        const lowerCorner = bbox['ows:LowerCorner'][0].split(' ')
        const upperCorner = bbox['ows:UpperCorner'][0].split(' ')
        if (!isNil(layer['OutputFormats'])) {
          outputFormats = layer['OutputFormats'].map(format => format['Format'][0])
        }
        const extent = [Number(lowerCorner[0]), Number(lowerCorner[1]), Number(upperCorner[0]), Number(upperCorner[1])]
        const name = !isNil(layer['wfs:Name']) ? layer['wfs:Name'][0] : layer['Name'][0]
        let defaultSRS = !isNil(layer['wfs:DefaultSRS']) ? layer['wfs:DefaultSRS'][0] : (!isNil(layer['DefaultSRS']) ? layer['DefaultSRS'][0] : '')
        if (isEmpty(defaultSRS)) {
          defaultSRS = !isNil(layer['wfs:DefaultCRS']) ? layer['wfs:DefaultCRS'][0] : (!isNil(layer['DefaultCRS']) ? layer['DefaultCRS'][0] : '')
        }
        const otherSRS = !isNil(layer['wfs:OtherSRS']) ? layer['wfs:OtherSRS'] : (!isNil(layer['OtherSRS']) ? layer['OtherSRS'] : [])
        let title = !isNil(layer['wfs:Title']) ? layer['wfs:Title'][0] : (!isNil(layer['Title']) ? layer['Title'][0] : name)
        if (isNil(title) || isEmpty(title)) {
          title = name
        }
        layers.push({
          name,
          title: title,
          subtitles: [],
          extent,
          wfs: true,
          defaultSRS: defaultSRS,
          otherSRS: otherSRS,
          version: version,
          outputFormats
        })
      }
    }
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to process WFS GetCapabilities.')
  }
  wfsInfo.layers = layers
  return wfsInfo
}

function getTileRequestURL (wmsUrl, layers, width, height, bbox, srs, version, format) {
  let { baseUrl, queryParams } = getBaseUrlAndQueryParams(wmsUrl)
  if (queryParams['service']) {
    delete queryParams['service']
  }
  queryParams['service'] = 'WMS'
  queryParams['request'] = 'GetMap'
  queryParams['version'] = version
  queryParams['layers'] = layers.join()
  queryParams['width'] = width
  queryParams['height'] = height
  queryParams['format'] = format
  queryParams['transparent'] = 'true'
  queryParams[getReferenceSystemNameForWMSRequest(version)] = srs
  queryParams['bbox'] = bbox
  queryParams['styles'] = ''
  return generateUrlWithQueryParams(baseUrl, queryParams)
}

function getFeatureRequestURL (wfsUrl, layer, outputFormat, referenceSystemName, version) {
  let { baseUrl, queryParams } = getBaseUrlAndQueryParams(wfsUrl)
  if (queryParams['service']) {
    delete queryParams['service']
  }
  queryParams['service'] = 'WFS'
  if (version === WFS_VERSIONS.V2_0_0) {
    queryParams['typeNames'] = layer
  } else {
    queryParams['typeName'] = layer
  }
  queryParams['outputFormat'] = outputFormat
  queryParams['request'] = 'GetFeature'
  queryParams['version'] = version
  if (referenceSystemName !== null) {
    queryParams['srsName'] = referenceSystemName
  }
  return generateUrlWithQueryParams(baseUrl, queryParams)
}


export {
  WFS_VERSIONS,
  WMS_VERSIONS,
  WMS_CONSTANTS,
  supportedImageFormats,
  getGetCapabilitiesURL,
  getBaseURL,
  getBoundingBoxFromWMSLayer,
  getBoundingBoxForWMSRequest,
  getReferenceSystemNameForWMSRequest,
  getSRSForWMSLayer,
  getWMSLayers,
  getRecommendedFormat,
  getWMSInfo,
  getLayerOutputFormat,
  getWFSInfo,
  getTileRequestURL,
  getFeatureRequestURL,
  getWFSLayerCountURL,
  isGML3,
  isGML32,
  isGML2,
  isGeoJSON,
  testGetMapFor3857
}
