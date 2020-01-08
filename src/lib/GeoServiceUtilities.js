import URLUtilities from './URLUtilities'
import _ from 'lodash'
export default class GeoServiceUtilities {
  // get the GetCapabilities URL
  static getGetCapabilitiesURL (wmsUrl) {
    let {baseUrl, queryParams} = URLUtilities.getBaseUrlAndQueryParams(wmsUrl)
    if (queryParams['service']) {
      delete queryParams['service']
    }
    queryParams['request'] = 'GetCapabilities'
    return URLUtilities.generateUrlWithQueryParams(baseUrl, queryParams)
  }

  static getBaseURL (wmsUrl) {
    let {baseUrl, queryParams} = URLUtilities.getBaseUrlAndQueryParams(wmsUrl)
    if (queryParams['request']) {
      delete queryParams['request']
    }
    if (queryParams['service']) {
      delete queryParams['service']
    }
    return URLUtilities.generateUrlWithQueryParams(baseUrl, queryParams)
  }

  static getWMSVersionFromGetCapabilities (json) {
    let version = null
    if (!_.isNil(json['WMT_MS_Capabilities'])) {
      version = json['WMT_MS_Capabilities']['$']['version']
    } else if (!_.isNil(json['WMS_Capabilities'])) {
      version = json['WMS_Capabilities']['$']['version']
    }
    return version
  }

  static getWMSLayersFromGetCapabilities (json) {
    let layers = []
    if (!_.isNil(json['WMT_MS_Capabilities'])) {
      for (const layer of json['WMT_MS_Capabilities']['Capability'][0]['Layer'][0]['Layer']) {
        const bbox = layer['LatLonBoundingBox'][0]['$']
        const extent = [Number(bbox['minx']), Number(bbox['miny']), Number(bbox['maxx']), Number(bbox['maxy'])]
        layers.push({name: layer['Name'][0], extent: extent, wms: true, version: '1.1.1'})
      }
    } else if (!_.isNil(json['WMS_Capabilities'])) {
      for (const layer of json['WMS_Capabilities']['Capability'][0]['Layer'][0]['Layer']) {
        const bbox = layer['EX_GeographicBoundingBox'][0]
        const extent = [Number(bbox['westBoundLongitude']), Number(bbox['southBoundLatitude']), Number(bbox['eastBoundLongitude']), Number(bbox['northBoundLatitude'])]
        layers.push({name: layer['Name'][0], extent: extent, wms: true, version: '1.3.0'})
      }
    }
    return layers
  }

  static getWFSVersionFromGetCapabilities (json) {
    let version = null
    if (!_.isNil(json['WFS_Capabilities'])) {
      version = json['WFS_Capabilities']['$']['version']
    } else if (!_.isNil(json['wfs:WFS_Capabilities'])) {
      version = json['wfs:WFS_Capabilities']['$']['version']
    }
    return version
  }

  static getWFSLayersFromGetCapabilities (json) {
    let layers = []
    if (!_.isNil(json['WFS_Capabilities'])) {
      for (const layer of json['WFS_Capabilities']['FeatureTypeList'][0]['FeatureType']) {
        const bbox = layer['LatLongBoundingBox'][0]['$']
        const extent = [Number(bbox['minx']), Number(bbox['miny']), Number(bbox['maxx']), Number(bbox['maxy'])]
        layers.push({name: layer['Name'][0], extent: extent, wfs: true, version: this.getWFSVersionFromGetCapabilities(json)})
      }
    } else if (!_.isNil(json['wfs:WFS_Capabilities'])) {
      for (const layer of json['wfs:WFS_Capabilities']['FeatureTypeList'][0]['FeatureType']) {
        const bbox = layer['ows:WGS84BoundingBox'][0]
        const lowerCorner = bbox['ows:LowerCorner'][0].split(' ')
        const upperCorner = bbox['ows:UpperCorner'][0].split(' ')
        const extent = [Number(lowerCorner[0]), Number(lowerCorner[1]), Number(upperCorner[0]), Number(upperCorner[1])]
        layers.push({name: layer['Name'][0], extent: extent, wfs: true, version: this.getWFSVersionFromGetCapabilities(json)})
      }
    }
    return layers
  }

  static getTileRequestURL (wmsUrl, layer, width, height, bbox, referenceSystemName) {
    let {baseUrl, queryParams} = URLUtilities.getBaseUrlAndQueryParams(wmsUrl)
    if (queryParams['service']) {
      delete queryParams['service']
    }
    queryParams['request'] = 'GetMap'
    queryParams['layers'] = layer
    queryParams['width'] = width
    queryParams['height'] = height
    queryParams['format'] = 'image/png'
    queryParams['transparent'] = 'true'
    queryParams[referenceSystemName] = 'crs:84'
    queryParams['bbox'] = bbox
    return URLUtilities.generateUrlWithQueryParams(baseUrl, queryParams)
  }

  static getFeatureRequestURL (wfsUrl, layer, outputFormat, referenceSystemName) {
    let {baseUrl, queryParams} = URLUtilities.getBaseUrlAndQueryParams(wfsUrl)
    if (queryParams['service']) {
      delete queryParams['service']
    }
    queryParams['request'] = 'GetFeature'
    queryParams['typeNames'] = layer
    queryParams['outputFormat'] = outputFormat
    queryParams['srsName'] = referenceSystemName
    return URLUtilities.generateUrlWithQueryParams(baseUrl, queryParams)
  }
}
