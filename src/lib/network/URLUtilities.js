import isNil from 'lodash/isNil'

function getBaseUrlAndQueryParams (url) {
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

function generateUrlWithQueryParams (url, queryParams) {
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

function isXYZ (url) {
  const xIndex = url.toLowerCase().indexOf('{x}')
  const yIndex = url.toLowerCase().indexOf('{y}')
  const zIndex = url.toLowerCase().indexOf('{z}')
  return zIndex > -1 && zIndex < xIndex && xIndex < yIndex
}

function requiresSubdomains (url) {
  return url.toLowerCase().indexOf('{s}') > -1
}

function isWMS (url) {
  return url.toLowerCase().indexOf('wms') > -1
}


function isWMTS (url) {
  return url.toLowerCase().indexOf('wmts') > -1
}

function isWFS (url) {
  return url.toLowerCase().indexOf('wfs') > -1
}

function isArcGISFeatureService (url) {
  return url.toLowerCase().indexOf('featureserver') > -1
}

function isUrlValid (string) {
  let url
  try {
    url = new URL(string)
  } catch (e) {
    return false
  }

  return url.protocol === 'http:' || url.protocol === 'https:'
}

export {
  getBaseUrlAndQueryParams,
  generateUrlWithQueryParams,
  isXYZ,
  requiresSubdomains,
  isWMS,
  isWFS,
  isWMTS,
  isArcGISFeatureService,
  isUrlValid
}
