import isNil from 'lodash/isNil'
import cloneDeep from 'lodash/cloneDeep'
import isEmpty from 'lodash/isEmpty'
import { getBaseUrlAndQueryParams } from './URLUtilities'
import {
  getGetCapabilitiesURL,
  getWMSInfo,
  getWFSInfo,
  WMS_VERSIONS,
  WFS_VERSIONS
} from '../util/geoserver/GeoServiceUtilities'
import { generateUrlForTile, fixXYZTileServerUrlForLeaflet } from '../util/xyz/XYZTileUtilities'
import CancellableServiceRequest from './CancellableServiceRequest'
import AxiosRequestScheduler from './AxiosRequestScheduler'
import {
  isMapCacheTimeoutError,
  getAuthenticationMethod,
  TIMEOUT_STATUS,
  isAuthenticationError,
  SERVICE_TYPE,
  getServiceType,
  isMapCacheUserCancellationError,
  USER_CANCELLED_MESSAGE,
  USER_CANCELLED_STATUS,
  isUserCancellation,
  isNotFoundError
} from './HttpUtilities'
// import { parseStringPromise } from 'xml2js'
import { getWMTSCapabilitiesURL, getWMTSInfo } from '../util/wmts/WMTSUtilities'

async function parseStringPromise () {
  return ''
}
/**
 * These functions handles connections to supported GIS services
 * WMS, WFS, XYZ and ArcGIS
 */

/**
 * Wraps a connection and returns consistent error messages
 * @param connFunc
 * @returns {Promise<{serviceInfo: undefined, error: undefined}>}
 */
async function connectionWrapper (connFunc) {
  let result = {
    serviceInfo: undefined,
    error: undefined
  }
  try {
    result = await connFunc()
  } catch (e) {
    if (isMapCacheTimeoutError(e)) {
      result.error = {
        status: TIMEOUT_STATUS,
        statusText: 'Request timed out'
      }
    } else if (isMapCacheUserCancellationError(e)) {
      result.error = {
        status: USER_CANCELLED_STATUS,
        statusText: USER_CANCELLED_MESSAGE
      }
    } else if (e.response) {
      result.error = {
        status: e.response.status,
        statusText: e.response.statusText,
        authType: getAuthenticationMethod(e.response)
      }
    } else if (e.request) {
      if (navigator.onLine) {
        result.error = {
          status: -1,
          statusText: 'Unable to reach server'
        }
      } else {
        result.error = {
          status: -1,
          statusText: 'Network error'
        }
      }
    } else {
      result.error = {
        status: -1,
        statusText: e
      }
    }
  }
  return result
}

/**
 * Tests a WMTS connection
 * @param serviceUrl
 * @param options
 * @returns {Promise<Object>}
 */
async function testWebMapTileServiceConnection (serviceUrl, options) {
  let serviceInfo
  let error = undefined
  let withCredentials = false
  let result = await connectionWrapper(async () => {
    let serviceInfo
    let error = undefined
    const url = getWMTSCapabilitiesURL(serviceUrl)
    let cancellableServiceRequest = new CancellableServiceRequest()
    cancellableServiceRequest.withCredentials = options.withCredentials || false
    let response = await cancellableServiceRequest.request(url)
    withCredentials = cancellableServiceRequest.requiredCredentials()
    if (response) {
      let result = await parseStringPromise(response.data)
      let wmtsInfo = getWMTSInfo(result, url.indexOf('https') !== -1)
      serviceInfo = {
        title: 'WMTS Service',
        abstract: undefined,
        version: '1.0.0',
        serviceLayers: wmtsInfo.layers,
        wmtsInfo: wmtsInfo
      }
      if (wmtsInfo.serviceIdentification != null) {
        if (wmtsInfo.serviceIdentification.title != null) {
          serviceInfo.title = wmtsInfo.serviceIdentification.title
        }
        if (wmtsInfo.serviceIdentification.abstract != null) {
          serviceInfo.abstract = wmtsInfo.serviceIdentification.abstract
        }
      }
      if (wmtsInfo.serviceProvider != null) {
        serviceInfo.contactOrg = wmtsInfo.serviceProvider.providerName
        if (wmtsInfo.serviceProvider.serviceContact != null) {
          serviceInfo.contactName = wmtsInfo.serviceProvider.serviceContact.contactName
        }
      }
    } else {
      error = 'No response.'
    }
    return { serviceInfo, error, withCredentials }
  })

  serviceInfo = result.serviceInfo
  if (!isNil(serviceInfo)) {
    error = undefined
  } else if (isNil(error) || error.status < 0) {
    error = result.error
  }
  return { serviceInfo, error, withCredentials }
}

/**
 * Tests a WMS connection
 * @param serviceUrl
 * @param options
 * @returns {Promise<Object>}
 */
async function testWebMapServiceConnection (serviceUrl, options) {
  let serviceInfo
  let error = undefined
  let withCredentials = false
  const supportedWMSVersions = options.version ? [options.version] : [WMS_VERSIONS.V1_3_0, WMS_VERSIONS.V1_1_1]
  for (let i = 0; i < supportedWMSVersions.length; i++) {
    const version = supportedWMSVersions[i]
    let result = await connectionWrapper(async () => {
      let serviceInfo
      let error = undefined
      const url = getGetCapabilitiesURL(serviceUrl, version, 'WMS')
      let cancellableServiceRequest = new CancellableServiceRequest()
      cancellableServiceRequest.withCredentials = options.withCredentials || false
      let response = await cancellableServiceRequest.request(url)
      withCredentials = cancellableServiceRequest.requiredCredentials()
      if (response) {
        let result = await parseStringPromise(response.data)
        let wmsInfo = await getWMSInfo(serviceUrl, result, version, withCredentials)

        serviceInfo = {
          title: wmsInfo.title || 'WMS Service',
          abstract: wmsInfo.abstract,
          version: version,
          contactName: wmsInfo.contactName,
          contactOrg: wmsInfo.contactOrg,
          serviceLayers: wmsInfo.layers,
          format: wmsInfo.format
        }
      } else {
        error = 'No response.'
      }
      return { serviceInfo, error, withCredentials }
    })
    serviceInfo = result.serviceInfo
    if (!isNil(serviceInfo)) {
      error = undefined
      break
    } else if (isNil(error) || error.status < 0) {
      error = result.error
    }
    if (isAuthenticationError(error) || isUserCancellation(error)) {
      break
    }
  }
  return { serviceInfo, error, withCredentials }
}

/**
 * Tests a WFS connection
 * @param serviceUrl
 * @param options
 * @returns {Promise<Object>}
 */
async function testWebFeatureServiceConnection (serviceUrl, options) {
  let serviceInfo
  let error = undefined
  let withCredentials = false
  const supportedWFSVersions = options.version ? [options.version] : [WFS_VERSIONS.V2_0_0, WFS_VERSIONS.V1_1_0, WFS_VERSIONS.V1_0_0]
  let version
  for (let i = 0; i < supportedWFSVersions.length; i++) {
    version = supportedWFSVersions[i]
    let result = await connectionWrapper(async () => {
      let serviceInfo
      let error = undefined

      const url = getGetCapabilitiesURL(serviceUrl, version, 'WFS')
      let cancellableServiceRequest = new CancellableServiceRequest()
      cancellableServiceRequest.withCredentials = options.withCredentials || false
      let response = await cancellableServiceRequest.request(url)
      let result = await parseStringPromise(response.data)
      let wfsInfo = getWFSInfo(result, version)
      serviceInfo = {
        title: wfsInfo.title || 'WFS Service',
        abstract: wfsInfo.abstract,
        version: version,
        contactName: wfsInfo.contactName,
        contactOrg: wfsInfo.contactOrg,
        serviceLayers: wfsInfo.layers,
        unsupportedServiceLayers: []
      }
      withCredentials = cancellableServiceRequest.requiredCredentials()
      return { serviceInfo, error, withCredentials }
    })
    serviceInfo = result.serviceInfo
    if (!isNil(serviceInfo)) {
      error = undefined
      break
    } else if (isNil(error) || error.status < 0) {
      error = result.error
    }
    if (isAuthenticationError(error)) {
      break
    }
  }
  return { serviceInfo, error, withCredentials }
}

async function testXYZin4326 (serviceUrl, subdomains, options) {
  let is4326 = false
  // 4326 tiles will have two tiles at zoom level 0
  const url = generateUrlForTile(serviceUrl, subdomains, 1, 0, 0)
  let cancellableServiceRequest = new CancellableServiceRequest()
  cancellableServiceRequest.withCredentials = options.withCredentials || false
  try {
    const response = await cancellableServiceRequest.request(url)
    if (response != null && response.headers != null) {
      const contentLength = response.headers['content-length'] || response.headers['Content-Length']
      if (contentLength != null && contentLength !== 0) {
        is4326 = true
      }
    }
  } catch (e) {
    // 401 unauthorized, no need to keep checking
    if (e.response && e.response.status === 401) {
      throw e
    }
  }
  return is4326
}

/**
 * Tests a XYZ connection
 * @param serviceUrl
 * @param options
 * @returns {Promise<Object>}
 */
async function testXYZTileServiceConnection (serviceUrl, options) {
  return connectionWrapper(async () => {
    let serviceInfo
    let limitedTileSet = false
    let error
    let requiredCredentials = false

    const requiresSubdomains = serviceUrl.indexOf('{s}') !== -1
    // test all subdomains
    if (requiresSubdomains) {
      if (options.subdomains && options.subdomains.length > 0) {
        const invalidSubdomains = []
        const subdomains = options.subdomains
        for (let i = 0; i < subdomains.length; i++) {
          const subdomain = subdomains[i]
          // this assumes that the 0/0/0 tile exists, if we get a 404, we can assume things are okay
          const url = generateUrlForTile(serviceUrl, [subdomain], 0, 0, 0)
          let cancellableServiceRequest = new CancellableServiceRequest()
          cancellableServiceRequest.withCredentials = options.withCredentials || false
          try {
            await cancellableServiceRequest.request(url)
          } catch (e) {
            if (isNotFoundError(e)) {
              limitedTileSet = true
            } else {
              // 401 unauthorized, no need to keep checking
              if (e.response && e.response.status === 401) {
                throw e
              }
              invalidSubdomains.push(subdomain)
              if (options.cancelIfAnySubdomainsFail) {
                break
              }
            }
          }
          requiredCredentials = cancellableServiceRequest.requiredCredentials()
        }
        if (invalidSubdomains.length > 0) {
          error = 'The following XYZ service url subdomains were invalid: ' + invalidSubdomains.join(',')
        } else if (!options.omit4326Check) {
          const is4326 = await testXYZin4326(serviceUrl, subdomains, options)
          serviceInfo = {
            is4326
          }
        }
      } else {
        error = 'The XYZ service url requires at least one valid subdomain'
      }
    } else {
      const url = generateUrlForTile(serviceUrl, [], 0, 0, 0)
      let cancellableServiceRequest = new CancellableServiceRequest()
      cancellableServiceRequest.withCredentials = options.withCredentials || false
      try {
        await cancellableServiceRequest.request(url)
      } catch (e) {
        if (isNotFoundError(e)) {
          limitedTileSet = true
        } else {
          throw e
        }
      }
      const is4326 = await testXYZin4326(serviceUrl, [], options)

      serviceInfo = {
        limitedTileSet,
        is4326
      }
      requiredCredentials = cancellableServiceRequest.requiredCredentials()
    }
    return { serviceInfo, error, withCredentials: requiredCredentials }
  })
}

/**
 * Tests an ArcGIS FS connection
 * @param serviceUrl
 * @param options
 * @returns {Promise<Object>}
 */
// eslint-disable-next-line no-unused-vars
async function testArcGISFeatureServiceConnection (serviceUrl, options) {
  return connectionWrapper(async () => {
    let serviceInfo
    let error = undefined
    const { baseUrl, queryParams } = getBaseUrlAndQueryParams(serviceUrl)
    let url = baseUrl + '?f=pjson'
    if (!isNil(queryParams['token'])) {
      url = url + '&token=' + queryParams['token']
    }
    let cancellableServiceRequest = new CancellableServiceRequest()
    cancellableServiceRequest.withCredentials = options.withCredentials || false
    let response = await cancellableServiceRequest.request(url)
    serviceInfo = {
      title: 'ArcGIS REST Feature Service',
      abstract: response.data.serviceDescription || '',
      version: response.data.currentVersion,
      copyright: response.data.copyrightText || ''
    }
    serviceInfo.serviceLayers = response.data.layers.map(layer => {
      let title = !isNil(layer.parentLayerId) && layer.parentLayerId !== -1 ? response.data.layers.find(l => l.id === layer.parentLayerId).name : layer.name
      let subtitles = []
      if (!isNil(layer.parentLayerId) && layer.parentLayerId !== -1) {
        subtitles.push(layer.name)
      }
      return {
        id: layer.id,
        name: layer.name,
        title: title,
        subtitles: subtitles,
        arcGIS: true,
        version: response.data.currentVersion,
        geometryType: layer.geometryType,
        minScale: layer.minScale,
        maxScale: layer.maxScale
      }
    })
    serviceInfo.unsupportedServiceLayers = []
    return { serviceInfo, error, withCredentials: cancellableServiceRequest.requiredCredentials() }
  })
}

/**
 * This function will test a service connection and return the appropriate service information or an error
 * @param serviceUrl
 * @param serviceType
 * @param options - will include subdomains for the XYZ tile server url (if applicable) and a boolean for requesting auth
 * @returns {Promise<Object>}
 */
async function testServiceConnection (serviceUrl, serviceType, options) {
  let result = { serviceInfo: undefined, error: undefined, withCredentials: undefined }
  try {
    // validate url
    if (!isNil(serviceUrl) && !isEmpty(serviceUrl) && !isNil(serviceType) && serviceType !== -1) {
      switch (serviceType) {
        case SERVICE_TYPE.WMS:
          result = testWebMapServiceConnection(serviceUrl, options)
          break
        case SERVICE_TYPE.WFS:
          result = testWebFeatureServiceConnection(serviceUrl, options)
          break
        case SERVICE_TYPE.XYZ:
          result = testXYZTileServiceConnection(fixXYZTileServerUrlForLeaflet(serviceUrl), options)
          break
        case SERVICE_TYPE.WMTS:
          result = testWebMapTileServiceConnection(serviceUrl, options)
          break
        case SERVICE_TYPE.ARCGIS_FS:
          result = testArcGISFeatureServiceConnection(serviceUrl, options)
          break
        default:
          result = {
            serviceInfo: undefined,
            error: {
              status: -1,
              statusText: 'Service not supported. Supported services include WMS, WFS, XYZ, WMTS and ArcGIS FS'
            }
          }
          break
      }
    }
  } catch (e) {
    result = { serviceInfo: undefined, error: { status: e.status || -1, statusText: e.message || e } }
  }
  return result
}

/**
 * Gets throttled axios instance
 * @param rateLimit
 * @returns {AxiosRequestScheduler}
 */
function getAxiosRequestScheduler (rateLimit) {
  return new AxiosRequestScheduler(rateLimit)
}

/**
 * Attempts to connect to a source
 * @param projectId
 * @param source
 * @param updateDataSource
 * @param timeout
 * @returns {Promise<boolean>}
 */
async function connectToSource (projectId, source, updateDataSource, timeout = 10000) {
  let success = false
  if (!isNil(source)) {
    const serviceType = getServiceType(source.layerType)
    const options = {}
    if (source.subdomains) {
      options.subdomains = source.subdomains
    }
    if (source.version) {
      options.version = source.version
    }
    if (!isNil(timeout) && timeout > 0) {
      options.timeout = timeout
    }
    let { serviceInfo, error, withCredentials } = await testServiceConnection(source.filePath, serviceType, options)
    if (!isNil(serviceInfo)) {
      let valid = true
      // verify that this source is still valid when compared to the service info
      if (serviceType === SERVICE_TYPE.WMS) {
        const layers = source.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) !== -1)
        if (layers.length !== source.layers.length) {
          const missingLayers = source.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) === -1)
          error = {
            status: 400,
            statusText: 'The following layer' + (missingLayers.length > 1 ? 's' : '') + ' no longer exist: ' + missingLayers.join(', ')
          }
          valid = false
        }
      }
      if (valid) {
        let sourceClone = cloneDeep(source)
        sourceClone.error = undefined
        sourceClone.visible = true
        sourceClone.withCredentials = withCredentials
        updateDataSource(projectId, sourceClone)
        success = true
      }
    }
    if (error) {
      let sourceClone = cloneDeep(source)
      sourceClone.error = error
      sourceClone.visible = false
      updateDataSource(projectId, sourceClone)
    }
  }
  return success
}

/**
 * Attempts to connect to a source
 * @param baseMap
 * @param editBaseMap
 * @param timeout (default 5000)
 * @returns {Promise<boolean>}
 */
async function connectToBaseMap (baseMap, editBaseMap, timeout = 5000) {
  let success = false
  if (!isNil(baseMap.layerConfiguration)) {
    const serviceType = getServiceType(baseMap.layerConfiguration.layerType)
    const options = {}
    if (baseMap.layerConfiguration.subdomains) {
      options.subdomains = baseMap.layerConfiguration.subdomains
    }
    if (baseMap.layerConfiguration.version) {
      options.version = baseMap.layerConfiguration.version
    }
    if (!isNil(timeout) && timeout > 0) {
      options.timeout = timeout
    }
    if (!isNil(baseMap.layerConfiguration.withCredentials)) {
      options.withCredentials = baseMap.layerConfiguration.withCredentials
    }
    let {
      serviceInfo,
      error,
      withCredentials
    } = await testServiceConnection(baseMap.layerConfiguration.filePath, serviceType, options)
    if (!isNil(serviceInfo)) {
      let valid = true
      // verify that this baseMap is still valid when compared to the service info
      if (serviceType === SERVICE_TYPE.WMS) {
        const layers = baseMap.layerConfiguration.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) !== -1)
        if (layers.length !== baseMap.layerConfiguration.layers.length) {
          const missingLayers = baseMap.layerConfiguration.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) === -1)
          error = {
            status: 400,
            statusText: 'The following layer' + (missingLayers.length > 1 ? 's' : '') + ' no longer exist: ' + missingLayers.join(', ')
          }
          valid = false
        }
      }
      if (valid) {
        let baseMapClone = cloneDeep(baseMap)
        baseMapClone.error = undefined
        baseMapClone.withCredentials = withCredentials
        editBaseMap(baseMapClone)
        success = true
      }
    }
    if (error) {
      let baseMapClone = cloneDeep(baseMap)
      baseMapClone.error = error
      editBaseMap(baseMapClone)
    }
  }
  return success
}

export {
  getAxiosRequestScheduler,
  testWebFeatureServiceConnection,
  testWebMapServiceConnection,
  testXYZTileServiceConnection,
  testArcGISFeatureServiceConnection,
  testServiceConnection,
  connectToSource,
  connectToBaseMap
}
