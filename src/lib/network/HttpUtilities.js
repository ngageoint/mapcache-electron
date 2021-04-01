import isNil from 'lodash/isNil'

export default class HttpUtilities {
  static CREDENTIAL_TYPE_NONE = 0
  static CREDENTIAL_TYPE_CERTIFICATE = 1
  static CREDENTIAL_TYPE_BEARER = 2
  static CREDENTIAL_TYPE_BASIC = 3

  static DEFAULT_TIMEOUT = 5000
  static DEFAULT_RETRY_ATTEMPTS = 3
  static DEFAULT_RATE_LIMIT = 10
  static NO_LIMIT = -1

  static SERVICE_TYPE = {
    WMS: 0,
    WFS: 1,
    XYZ: 2,
    ARCGIS_FS: 3
  }

  static USER_CANCELLED_MESSAGE = 'Operation cancelled by user.'
  static TIMEOUT_MESSAGE = 'Operation timed out.'
  static TIMEOUT_STATUS = -2

  /**
   * Gets the service name for a given service type
   * @param serviceType
   * @returns {string}
   */
  static getServiceName(serviceType) {
    let serviceName = 'Unknown'

    switch (serviceType) {
      case HttpUtilities.SERVICE_TYPE.WMS:
        serviceName = 'WMS'
        break
      case HttpUtilities.SERVICE_TYPE.WFS:
        serviceName = 'WFS'
        break
      case HttpUtilities.SERVICE_TYPE.XYZ:
        serviceName = 'XYZ'
        break
      case HttpUtilities.SERVICE_TYPE.ARCGIS_FS:
        serviceName = 'ArcGIS FS'
        break
      default:
        serviceName = 'Unknown'
        break
    }
    return serviceName
  }

  static getServiceType(serviceName) {
    let serviceType = -1
    if (serviceName === 'WMS') {
      serviceType = HttpUtilities.SERVICE_TYPE.WMS
    } else if (serviceName === 'WFS') {
      serviceType = HttpUtilities.SERVICE_TYPE.WFS
    } else if (serviceName === 'XYZ' || serviceName === 'XYZServer') {
      serviceType = HttpUtilities.SERVICE_TYPE.XYZ
    } else if (serviceName === 'ArcGIS FS') {
      serviceType = HttpUtilities.SERVICE_TYPE.ARCGIS_FS
    }
    return serviceType
  }

  static getAuthType(authString) {
    let credentialType = HttpUtilities.CREDENTIAL_TYPE_NONE
    if (authString.toLowerCase() === 'basic') {
      credentialType = HttpUtilities.CREDENTIAL_TYPE_BASIC
    } else if (authString.toLowerCase() === 'bearer') {
      credentialType = HttpUtilities.CREDENTIAL_TYPE_BEARER
    }
    return credentialType
  }

  /**
   * Returns the suggested authentication method from the server's response
   * @param response
   * @returns {number}
   */
  static getAuthenticationMethod (response) {
    let authType = HttpUtilities.CREDENTIAL_TYPE_NONE
    if (response.headers['www-authenticate']) {
      authType = HttpUtilities.getAuthType(response.headers['www-authenticate'].split(' ')[0])
    }
    return authType
  }

  /**
   * Checks if an error is an authentication error
   * @param error
   * @returns {boolean}
   */
  static isAuthenticationError (error) {
    return !isNil(error) && error.status === 401
  }

  /**
   * Checks if an error is an authentication error
   * @param response
   * @returns {boolean}
   */
  static isAuthenticationErrorResponse (response) {
    return !isNil(response) && response.status === 401
  }

  /**
   * Checks if an error is a server error
   * @param error
   * @returns {boolean}
   */
  static isServerError (error) {
    return !isNil(error) && error.status >= 500
  }

  /**
   * Checks if an error is due to a timeout
   * @param error
   * @returns {boolean}
   */
  static isTimeoutError (error) {
    return !isNil(error) && error.status === HttpUtilities.TIMEOUT_STATUS
  }

  /**
   * Tests if error is a mapcache timeout (this timeout occurs when a response from the server has not been reached after waiting a user specified amount of time)
   * @param error
   * @returns {boolean}
   */
  static isMapCacheTimeoutError(error) {
    return !isNil(error) && !isNil(error.message) && error.message === HttpUtilities.TIMEOUT_MESSAGE
  }
}
