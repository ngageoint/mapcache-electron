import isNil from 'lodash/isNil'

export default class URLUtilities {
  static getBaseUrlAndQueryParams (url) {
    let query = ''
    let baseUrl = url.slice()
    let queryIndex = url.indexOf('?')
    if (queryIndex > 0) {
      query = url.substring(queryIndex + 1)
      baseUrl = url.substring(0, queryIndex)
    }
    let queryObject = {}
    const params = query.split('&')
    params.forEach(param => {
      const [key, value] = param.split('=')
      queryObject[key] = value
    })
    return {
      baseUrl: baseUrl,
      queryParams: queryObject
    }
  }
  static generateUrlWithQueryParams (url, queryParams) {
    let newUrl = url + '?'
    Object.keys(queryParams).forEach(key => {
      if (!isNil(key) && !isNil(queryParams[key])) {
        if (newUrl.endsWith('?')) {
          newUrl += key + '=' + queryParams[key]
        } else {
          newUrl += '&' + key + '=' + queryParams[key]
        }
      }
    })
    return newUrl
  }
  static isXYZ (url) {
    const xIndex = url.toLowerCase().indexOf('{x}')
    const yIndex = url.toLowerCase().indexOf('{y}')
    const zIndex = url.toLowerCase().indexOf('{z}')
    return zIndex > -1 && zIndex < xIndex && xIndex < yIndex
  }
  static requiresSubdomains (url) {
    return url.toLowerCase().indexOf('{s}') > -1
  }
  static isWMS (url) {
    return url.toLowerCase().indexOf('wms') > -1
  }
  static isWFS (url) {
    return url.toLowerCase().indexOf('wfs') > -1
  }
  static isArcGISFeatureService (url) {
    return url.toLowerCase().indexOf('featureserver') > -1
  }
  static isUrlValid (string) {
    let url
    try {
      url = new URL(string)
    } catch (e) {
      return false
    }

    return url.protocol === 'http:' || url.protocol === 'https:'
  }
}
