import isNil from 'lodash/isNil'

const CREDENTIAL_TYPE_NONE = 0
const CREDENTIAL_TYPE_CERTIFICATE = 1
const CREDENTIAL_TYPE_BEARER = 2
const CREDENTIAL_TYPE_BASIC = 3
const DEFAULT_TIMEOUT = 5000
const DEFAULT_RETRY_ATTEMPTS = 3
const DEFAULT_RATE_LIMIT = 10
const NO_LIMIT = -1
const SERVICE_TYPE = {
  WMS: 0,
  WFS: 1,
  XYZ: 2,
  ARCGIS_FS: 3,
  OVERPASS: 4,
  WMTS: 5
}
const METHOD = {
  GET: 'GET',
  POST: 'POST'
}
const USER_CANCELLED_MESSAGE = 'Operation cancelled by user.'
const TIMEOUT_MESSAGE = 'Operation timed out.'
const TIMEOUT_STATUS = -2
const USER_CANCELLED_STATUS = -3

function getAuthType(authString) {
  let credentialType = CREDENTIAL_TYPE_NONE
  if (authString.toLowerCase() === 'basic') {
    credentialType = CREDENTIAL_TYPE_BASIC
  } else if (authString.toLowerCase() === 'bearer') {
    credentialType = CREDENTIAL_TYPE_BEARER
  }
  return credentialType
}

/**
 * Gets the service name for a given service type
 * @param serviceType
 * @returns {string}
 */
function getServiceName(serviceType) {
  let serviceName = 'Unknown'

  switch (serviceType) {
    case SERVICE_TYPE.WMS:
      serviceName = 'WMS'
      break
    case SERVICE_TYPE.WFS:
      serviceName = 'WFS'
      break
    case SERVICE_TYPE.XYZ:
      serviceName = 'XYZ'
      break
    case SERVICE_TYPE.ARCGIS_FS:
      serviceName = 'ArcGIS FS'
      break
    case SERVICE_TYPE.WMTS:
      serviceName = 'WMTS'
      break
    default:
      serviceName = 'Unknown'
      break
  }
  return serviceName
}

function getServiceType(serviceName) {
  let serviceType = -1
  if (serviceName === 'WMS') {
    serviceType = SERVICE_TYPE.WMS
  } else if (serviceName === 'WFS') {
    serviceType = SERVICE_TYPE.WFS
  } else if (serviceName === 'XYZ' || serviceName === 'XYZServer') {
    serviceType = SERVICE_TYPE.XYZ
  } else if (serviceName === 'WMTS') {
    serviceType = SERVICE_TYPE.WMTS
  }  else if (serviceName === 'ArcGIS FS') {
    serviceType = SERVICE_TYPE.ARCGIS_FS
  }
  return serviceType
}

/**
 * Returns the suggested authentication method from the server's response
 * @param response
 * @returns {number}
 */
function getAuthenticationMethod (response) {
  let authType = CREDENTIAL_TYPE_NONE
  if (response.headers['www-authenticate']) {
    authType = getAuthType(response.headers['www-authenticate'].split(' ')[0])
  }
  return authType
}

/**
 * Checks if an error is a not found error
 * @param error
 * @returns {boolean}
 */
function isNotFoundError (error) {
  return !isNil(error) && !isNil(error.response) && error.response.status === 404
}

/**
 * Checks if an error is an authentication error
 * @param error
 * @returns {boolean}
 */
function isAuthenticationError (error) {
  return !isNil(error) && error.status === 401
}

/**
 * Checks if an error is a user cancellation error
 * @param error
 * @returns {boolean}
 */
function isUserCancellation (error) {
  return !isNil(error) && error.status === -3
}

/**
 * Checks if an error is an authentication error
 * @param response
 * @returns {boolean}
 */
function isAuthenticationErrorResponse (response) {
  return !isNil(response) && response.status === 401
}

/**
 * Checks if an error is a server error
 * @param error
 * @returns {boolean}
 */
function isServerError (error) {
  return !isNil(error) && error.status >= 500
}

/**
 * Checks if an error is due to a timeout
 * @param error
 * @returns {boolean}
 */
function isTimeoutError (error) {
  return !isNil(error) && error.status === TIMEOUT_STATUS
}

/**
 * Tests if error is a mapcache timeout (this timeout occurs when a response from the server has not been reached after waiting a user specified amount of time)
 * @param error
 * @returns {boolean}
 */
function isMapCacheTimeoutError(error) {
  return !isNil(error) && !isNil(error.message) && error.message.toLowerCase().indexOf('timeout') !== -1
}
/**
 * Tests if error is a mapcache timeout (this timeout occurs when a response from the server has not been reached after waiting a user specified amount of time)
 * @param error
 * @returns {boolean}
 */
function isMapCacheUserCancellationError(error) {
  return !isNil(error) && !isNil(error.message) && error.message === USER_CANCELLED_MESSAGE
}

export {
  CREDENTIAL_TYPE_NONE,
  CREDENTIAL_TYPE_CERTIFICATE,
  CREDENTIAL_TYPE_BEARER,
  CREDENTIAL_TYPE_BASIC,
  DEFAULT_TIMEOUT,
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_RATE_LIMIT,
  NO_LIMIT,
  SERVICE_TYPE,
  USER_CANCELLED_MESSAGE,
  TIMEOUT_MESSAGE,
  TIMEOUT_STATUS,
  USER_CANCELLED_STATUS,
  getServiceName,
  getServiceType,
  getAuthType,
  getAuthenticationMethod,
  isAuthenticationError,
  isAuthenticationErrorResponse,
  isServerError,
  isTimeoutError,
  isMapCacheTimeoutError,
  isMapCacheUserCancellationError,
  isUserCancellation,
  isNotFoundError,
  METHOD
}
