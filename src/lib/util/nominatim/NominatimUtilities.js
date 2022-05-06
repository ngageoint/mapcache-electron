import keys from 'lodash/keys'
import { OpenStreetMapProvider } from 'leaflet-geosearch'
import { environment } from '../../env/env'
import pointOnFeature from '@turf/point-on-feature'

async function queryNominatim (query, bbox = null, idsToIgnore = []) {
  const requestObject = {
    q: query,
    format: 'geojson',
    addressdetails: 1,
    extratags: 1,
    namedetails: 1,
    limit: 10,
    exclude_place_ids: idsToIgnore
  }
  if (bbox) {
    requestObject.viewbox = bbox.join(',')
    requestObject.bounded = 1
  }
  return queryWithRequestObject(requestObject)
}

async function reverseQueryNominatim (lat, lon, zoom) {
  const requestObject = {
    lat: lat,
    lon: lon,
    zoom: zoom >= 15 ? 18 : zoom,
    format: 'geojson',
    addressdetails: 1,
    extratags: 1,
    namedetails: 1
  }
  return queryWithRequestObject(requestObject, true)
}

function prettyifyWords (words, uppercase = false) {
  let pretty = words.toLowerCase().replaceAll('_', ' ')
  if (uppercase) {
    pretty = pretty.replace(words.charAt(0), words.charAt(0).toUpperCase())
  }
  return pretty
}

function prettyifyAddress (properties) {
  let prettyAddress = ''
  if (properties.house_number != null) {
    prettyAddress += properties.house_number + ' '
  }
  if (properties.road != null) {
    prettyAddress += properties.road + ', '
  }
  if (properties.suburb != null) {
    prettyAddress += properties.suburb + ', '
  }
  if (properties.city != null) {
    prettyAddress += properties.city + ', '
  }
  if (properties.state != null) {
    prettyAddress += properties.state + ', '
  }
  if (properties.country != null) {
    prettyAddress += properties.country
  }
  return prettyAddress
}

function getPrimaryName (feature) {
  let name = feature.properties.namedetails['name:en']
  if (name == null && feature.properties.display_name != null) {
    name = feature.properties.display_name.split(',')[0]
  }
  return name
}

function getCountryCodeName (feature) {
  let name
  if (feature.properties.country_code && feature.properties.namedetails['name:' + feature.properties.country_code]) {
    name = feature.properties['name:' + feature.properties.country_code]
  } else {
    name = feature.properties.namedetails.name
  }
  return name
}

/**
 * Queries OSM Nominatim, returning the request object and resulting features
 * @param requestObject
 * @param reverse - running reverse query or not
 * @param timeout - timeout to wait for results
 * @return {Promise<{featureCollection: any, requestObject: {q, exclude_place_ids: *[], addressdetails: number, polygon_geojson: number, format: string, limit: number, extratags: number, namedetails: number}}>}
 */
async function queryWithRequestObject (requestObject, reverse = false, timeout = 10000) {
  try {
    requestObject.polygon_geojson = 1
    const searchUrl = `${environment.nominatimUrl}/search`
    const reverseUrl = `${environment.nominatimUrl}/reverse`
    const provider = new OpenStreetMapProvider({ searchUrl, reverseUrl })
    let url = provider.getUrl(reverse ? provider.reverseUrl : provider.searchUrl, requestObject)
    let controller = new AbortController()
    let id = setTimeout(() => controller.abort(), timeout)
    let request = await fetch(url, { signal: controller.signal })
    const featureCollection = await request.json()
    clearTimeout(id)

    // need to make an additional request to get the center points of these features
    const pointRequestObject = Object.assign({}, requestObject)
    pointRequestObject.polygon_geojson = 0
    pointRequestObject.addressdetails = 0
    pointRequestObject.extratags = 0
    pointRequestObject.namedetails = 0
    controller = new AbortController()
    id = setTimeout(() => controller.abort(), timeout)
    url = provider.getUrl(provider.searchUrl, pointRequestObject)
    request = await fetch(url, { signal: controller.signal })
    const featureCollectionPointsOnly = await request.json()
    clearTimeout(id)

    const wikiImageMap = {}

    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i]
      feature.properties.attribution = featureCollection.licence
      if (feature.properties && feature.properties.extratags) {
        if (feature.properties.extratags.image == null && feature.properties.extratags.wikipedia != null) {
          const parts = feature.properties.extratags.wikipedia.split(':')
          const countryCode = parts[0]
          if (wikiImageMap[countryCode] == null) {
            wikiImageMap[countryCode] = []
          }
          wikiImageMap[countryCode].push({ osm_id: feature.properties.osm_id, title: parts[1] })
        }
      }
      if (feature.properties.extratags) {
        keys(feature.properties.extratags).forEach(tag => {
          feature.properties[tag] = feature.properties.extratags[tag]
        })
        delete feature.properties.extratags
      }
      if (feature.properties.namedetails) {
        keys(feature.properties.namedetails).forEach(key => feature.properties[key] = feature.properties.namedetails[key])
        feature.properties.name = getPrimaryName(feature)
        feature.properties.country_name = getCountryCodeName(feature)
        delete feature.properties.namedetails
      }
      if (feature.properties.address) {
        keys(feature.properties.address).forEach(key => feature.properties[key] = feature.properties.address[key])
        delete feature.properties.address
      }
      if (feature.geometry.type !== 'Point') {
        const centerFeature = featureCollectionPointsOnly.features.find(f => f.properties.place_id === feature.properties.place_id)
        if (centerFeature != null) {
          feature.center_point = centerFeature.geometry
        } else {
          feature.center_point = pointOnFeature(feature).geometry

        }
      }
    }

    // search for images to display
    const countryCodes = keys(wikiImageMap)
    for (let i = 0; i < countryCodes.length; i++) {
      const countryCode = countryCodes[i]
      const titles = wikiImageMap[countryCode].map(title => title.title)
      controller = new AbortController()
      id = setTimeout(() => controller.abort(), timeout)
      let wikiRes = null
      if (environment.wikipediaUrl != null) {
        try {
          const wikiReq = await fetch(environment.wikipediaUrl.replace('{cc}', countryCode) + '/w/api.php?action=query&titles=' + titles.join('|') + '&prop=pageimages&format=json&pithumbsize=500', { signal: controller.signal })
          wikiRes = await wikiReq.json()
          // eslint-disable-next-line no-empty, no-unused-vars
        } catch (e) {
        }
      }
      clearTimeout(id)
      if (wikiRes != null) {
        keys(wikiRes.query.pages).filter(key => wikiRes.query.pages[key].thumbnail != null).forEach((page) => {
          const titleObj = wikiImageMap[countryCode].find(t => t.title === wikiRes.query.pages[page].title)
          if (titleObj) {
            const feature = featureCollection.features.find(feature => feature.properties.osm_id === titleObj.osm_id)
            if (feature != null) {
              feature.properties.image = wikiRes.query.pages[page].thumbnail.source
            }
          }
        })
      }
    }

    return { requestObject, featureCollection, fitMapToData: true, reverse: reverse }
  } catch (e) {
    return {
      requestObject,
      featureCollection: { type: 'FeatureCollection', features: [] },
      fitMapToData: false,
      reverse: reverse,
      error: 'Failed to retrieve data.'
    }
  }
}

export {
  queryNominatim,
  reverseQueryNominatim,
  queryWithRequestObject,
  prettyifyWords,
  prettyifyAddress
}
