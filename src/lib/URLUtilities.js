export default class URLUtilities {
  static getBaseUrlAndQueryParams (url) {
    let query = ''
    let baseUrl = url + ''
    let queryIndex = url.indexOf('?')
    if (queryIndex > 0) {
      query = url.substring(queryIndex + 1)
      baseUrl = url.substring(0, queryIndex)
    }
    let queryObject = {}
    let equalIdx
    while ((equalIdx = query.indexOf('=')) > 0) {
      let key = query.substring(0, equalIdx)
      let value = query.substring(equalIdx + 1)
      let additionalParamIndex = value.indexOf('&')
      if (additionalParamIndex > 0) {
        value = value.substring(0, additionalParamIndex)
        query = value.substring(additionalParamIndex + 1)
      } else {
        query = ''
      }
      queryObject[key] = value
    }
    return {
      baseUrl: baseUrl,
      queryParams: queryObject
    }
  }
  static generateUrlWithQueryParams (url, queryParams) {
    let newUrl = url + '?'
    Object.keys(queryParams).forEach(key => {
      if (newUrl.endsWith('?')) {
        newUrl += key + '=' + queryParams[key]
      } else {
        newUrl += '&' + key + '=' + queryParams[key]
      }
    })
    return newUrl
  }
  static isXYZ (url) {
    return url.toLowerCase().indexOf('{x}') > 0 && url.toLowerCase().indexOf('{y}') > 0 && url.toLowerCase().indexOf('{z}') > 0
  }
  static isWMS (url) {
    return url.toLowerCase().indexOf('wms') > 0
  }
  static isWFS (url) {
    return url.toLowerCase().indexOf('wfs') > 0
  }
}
