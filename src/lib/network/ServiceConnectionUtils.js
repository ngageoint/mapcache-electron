import isNil from 'lodash/isNil'
import cloneDeep from 'lodash/cloneDeep'
import isEmpty from 'lodash/isEmpty'
import URLUtilities from '../util/URLUtilities'
import GeoServiceUtilities from '../util/GeoServiceUtilities'
import XYZTileUtilities from '../util/XYZTileUtilities'
import CancellableServiceRequest from './CancellableServiceRequest'
import AxiosRequestScheduler from './AxiosRequestScheduler'
import HttpUtilities from './HttpUtilities'
import { parseStringPromise } from 'xml2js'

/**
 * This utility class handles connections to supported GIS services
 * WMS, WFS, XYZ and ArcGIS
 */
export default class ServiceConnectionUtils {

  /**
   * Gets throttled axios instance
   * @param rateLimit
   * @returns {AxiosRequestScheduler}
   */
  static getAxiosRequestScheduler (rateLimit) {
    return new AxiosRequestScheduler(rateLimit)
  }

  /**
   * Wraps a connection and returns consistent error messages
   * @param connFunc
   * @returns {Promise<{serviceInfo: undefined, error: undefined}>}
   */
  static async connectionWrapper (connFunc) {
    let result = {
      serviceInfo: undefined,
      error: undefined
    }
    try {
      result = await connFunc()
    } catch (e) {
      if (HttpUtilities.isMapCacheTimeoutError(e)) {
        result.error = {
          status: HttpUtilities.TIMEOUT_STATUS,
          statusText: 'Request timed out'
        }
      } else if (e.response) {
        result.error = {
          status: e.response.status,
          statusText: e.response.statusText,
          authType: HttpUtilities.getAuthenticationMethod(e.response)
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
   * Tests a WMS connection
   * @param serviceUrl
   * @param options
   * @returns {Promise<Object>}
   */
  static async testWebMapServiceConnection (serviceUrl, options) {
    let serviceInfo
    let error = undefined
    const supportedWMSVersions = options.version ? [options.version] : ['1.3.0', '1.1.1']
    for (let i = 0; i < supportedWMSVersions.length; i++) {
      const version = supportedWMSVersions[i]
      let result = await ServiceConnectionUtils.connectionWrapper(async () => {
        let serviceInfo
        let error = undefined
        const url = GeoServiceUtilities.getGetCapabilitiesURL(serviceUrl, version, 'WMS')
        let cancellableServiceRequest = new CancellableServiceRequest()
        let response = await cancellableServiceRequest.request(url, options)
        let result = await parseStringPromise(response.data)
        let wmsInfo = GeoServiceUtilities.getWMSInfo(result, version)
        serviceInfo = {
          title: wmsInfo.title || 'WMS Service',
          abstract: wmsInfo.abstract,
          version: version,
          contactName: wmsInfo.contactName,
          contactOrg: wmsInfo.contactOrg,
          serviceLayers: wmsInfo.layers,
          unsupportedServiceLayers: wmsInfo.unsupportedLayers,
          format: wmsInfo.format
        }
        return {serviceInfo, error}
      })
      serviceInfo = result.serviceInfo
      if (!isNil(serviceInfo)) {
        error = undefined
        break
      } else if (isNil(error) || error.status < 0) {
        error = result.error
      }
      if (HttpUtilities.isAuthenticationError(error)) {
        break
      }
    }
    return {serviceInfo, error}
  }

  /**
   * Tests a WFS connection
   * @param serviceUrl
   * @param options
   * @returns {Promise<Object>}
   */
  static async testWebFeatureServiceConnection (serviceUrl, options) {
    let serviceInfo
    let error = undefined
    const supportedWFSVersions = options.version ? [options.version] : ['2.0.0', '1.1.0', '1.0.0']
    let version
    for (let i = 0; i < supportedWFSVersions.length; i++) {
      version = supportedWFSVersions[i]
      let result = await ServiceConnectionUtils.connectionWrapper(async () => {
        let serviceInfo
        let error = undefined

        const url = GeoServiceUtilities.getGetCapabilitiesURL(serviceUrl, version, 'WFS')
        let cancellableServiceRequest = new CancellableServiceRequest()
        let response = await cancellableServiceRequest.request(url, options)
        let result = await parseStringPromise(response.data)
        let wfsInfo = GeoServiceUtilities.getWFSInfo(result, version)
        serviceInfo = {
          title: wfsInfo.title || 'WFS Service',
          abstract: wfsInfo.abstract,
          version: version,
          contactName: wfsInfo.contactName,
          contactOrg: wfsInfo.contactOrg,
          serviceLayers: wfsInfo.layers,
          unsupportedServiceLayers: []
        }
        return {serviceInfo, error}
      })
      serviceInfo = result.serviceInfo
      if (!isNil(serviceInfo)) {
        error = undefined
        break
      } else if (isNil(error) || error.status < 0) {
        error = result.error
      }
      if (HttpUtilities.isAuthenticationError(error)) {
        break
      }
    }
    return {serviceInfo, error}
  }

  /**
   * Tests a XYZ connection
   * @param serviceUrl
   * @param options
   * @returns {Promise<Object>}
   */
  static async testXYZTileServiceConnection (serviceUrl, options) {
    return ServiceConnectionUtils.connectionWrapper(async () => {
      let serviceInfo
      let error

      const requiresSubdomains = serviceUrl.indexOf('{s}') !== -1
      // test all subdomains
      if (requiresSubdomains) {
        if (options.subdomains && options.subdomains.length > 0) {
          const invalidSubdomains = []
          const subdomains = options.subdomains
          for (let i = 0; i < subdomains.length; i++) {
            const subdomain = subdomains[i]
            try {
              const url = XYZTileUtilities.generateUrlForTile(serviceUrl, [subdomain], 0, 0, 0)
              let cancellableServiceRequest = new CancellableServiceRequest()
              await cancellableServiceRequest.request(url, options)
            } catch (e) {
              // 401 unauthorized, no need to keep checking
              if (e.response && e.response.status === 401) {
                throw e
              }
              invalidSubdomains.push(subdomain)
            }
          }
          if (invalidSubdomains.length > 0) {
            error = 'The following XYZ service url subdomains were invalid: ' + invalidSubdomains.join(',')
          } else {
            serviceInfo = {}
          }
        } else {
          error = 'The XYZ service url requires at least one valid subdomain'
        }
      } else {
        const url = XYZTileUtilities.generateUrlForTile(serviceUrl, [], 0, 0, 0)
        let cancellableServiceRequest = new CancellableServiceRequest()
        await cancellableServiceRequest.request(url, options)
        serviceInfo = {}
      }
      return {serviceInfo, error}
    })
  }

  /**
   * Tests an ArcGIS FS connection
   * @param serviceUrl
   * @param options
   * @returns {Promise<Object>}
   */
  static async testArcGISFeatureServiceConnection (serviceUrl, options) {
    return ServiceConnectionUtils.connectionWrapper(async () => {
      let serviceInfo
      let error = undefined
      const { baseUrl, queryParams } = URLUtilities.getBaseUrlAndQueryParams(serviceUrl)
      let url = baseUrl + '?f=pjson'
      if (!isNil(queryParams['token'])) {
        url = url + '&token=' + queryParams['token']
      }
      let cancellableServiceRequest = new CancellableServiceRequest()
      let response = await cancellableServiceRequest.request(url, options)
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
        return {id: layer.id, name: layer.name, title: title, subtitles: subtitles, arcGIS: true, version: response.data.currentVersion, geometryType: layer.geometryType, minScale: layer.minScale, maxScale: layer.maxScale}
      })
      serviceInfo.unsupportedServiceLayers = []
      return {serviceInfo, error}
    })
  }

  /**
   * This function will test a service connection and return the appropriate service information or an error
   * @param serviceUrl
   * @param serviceType
   * @param options - will include subdomains for the XYZ tile server url (if applicable) and a boolean for requesting auth
   * @returns {Promise<Object>}
   */
  static async testServiceConnection (serviceUrl, serviceType, options) {
    let result = {serviceInfo: undefined, error: undefined}
    try {
      // validate url
      if (!isNil(serviceUrl) && !isEmpty(serviceUrl) && !isNil(serviceType) && serviceType !== -1) {
        switch (serviceType) {
          case HttpUtilities.SERVICE_TYPE.WMS:
            result = ServiceConnectionUtils.testWebMapServiceConnection(serviceUrl, options)
            break
          case HttpUtilities.SERVICE_TYPE.WFS:
            result = ServiceConnectionUtils.testWebFeatureServiceConnection(serviceUrl, options)
            break
          case HttpUtilities.SERVICE_TYPE.XYZ:
            result = ServiceConnectionUtils.testXYZTileServiceConnection(XYZTileUtilities.fixXYZTileServerUrlForLeaflet(serviceUrl), options)
            break
          case HttpUtilities.SERVICE_TYPE.ARCGIS_FS:
            result = ServiceConnectionUtils.testArcGISFeatureServiceConnection(serviceUrl, options)
            break
          default:
            result = {serviceInfo: undefined, error: {status: -1, statusText: 'Service not supported. Supported services include WMS, WFS, XYZ and ArcGIS FS'}}
            break
        }
      }
    } catch (e) {
      result = {serviceInfo: undefined, error: {status: -1, statusText: e}}
    }
    return result
  }


  /**
   * Attempts to connect to a source
   * @param projectId
   * @param source
   * @param updateDataSource
   * @param allowAuth
   * @param timeout
   * @returns {Promise<boolean>}
   */
  static async connectToSource (projectId, source, updateDataSource, allowAuth = true, timeout = 5000) {
    let success = false
    if (!isNil(source)) {
      const serviceType = HttpUtilities.getServiceType(source.layerType)
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
      options.allowAuth = allowAuth
      let {serviceInfo, error} = await ServiceConnectionUtils.testServiceConnection(source.filePath, serviceType, options)
      if (!isNil(serviceInfo)) {
        let valid = true
        // verify that this source is still valid when compared to the service info
        if (serviceType === HttpUtilities.SERVICE_TYPE.WMS) {
          const layers = source.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) !== -1)
          if (layers.length !== source.layers.length) {
            const missingLayers = source.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) === -1)
            error = {status: 400, statusText: 'The following layer' + (missingLayers.length > 1 ? 's' : '') + ' no longer exist: ' + missingLayers.join(', ')}
            valid = false
          }
        }
        if (valid) {
          let sourceClone = cloneDeep(source)
          sourceClone.error = undefined
          sourceClone.visible = true
          updateDataSource({projectId: projectId, source: sourceClone})
          success = true
        }
      }
      if (error) {
        let sourceClone = cloneDeep(source)
        sourceClone.error = error
        sourceClone.visible = false
        updateDataSource({projectId: projectId, source: sourceClone})
      }
    }
    return success
  }

  /**
   * Attempts to connect to a source
   * @param baseMap
   * @param editBaseMap
   * @param allowAuth (default true)
   * @param timeout (default 5000)
   * @returns {Promise<boolean>}
   */
  static async connectToBaseMap (baseMap, editBaseMap, allowAuth = true, timeout = 5000) {
    let success = false
    if (!isNil(baseMap.layerConfiguration)) {
      const serviceType = HttpUtilities.getServiceType(baseMap.layerConfiguration.layerType)
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
      options.allowAuth = allowAuth
      let {serviceInfo, error} = await ServiceConnectionUtils.testServiceConnection(baseMap.layerConfiguration.filePath, serviceType, options)
      if (!isNil(serviceInfo)) {
        let valid = true
        // verify that this baseMap is still valid when compared to the service info
        if (serviceType === HttpUtilities.SERVICE_TYPE.WMS) {
          const layers = baseMap.layerConfiguration.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) !== -1)
          if (layers.length !== baseMap.layerConfiguration.layers.length) {
            const missingLayers = baseMap.layerConfiguration.layers.filter(layer => serviceInfo.serviceLayers.find(l => l.name === layer) === -1)
            error = {status: 400, statusText: 'The following layer' + (missingLayers.length > 1 ? 's' : '') + ' no longer exist: ' + missingLayers.join(', ')}
            valid = false
          }
        }
        if (valid) {
          let baseMapClone = cloneDeep(baseMap)
          baseMapClone.error = undefined
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
}
