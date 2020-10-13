import URLUtilities from './URLUtilities'
import _ from 'lodash'
export default class GeoServiceUtilities {
  // get the GetCapabilities URL
  static getGetCapabilitiesURL (wmsUrl) {
    let {baseUrl, queryParams} = URLUtilities.getBaseUrlAndQueryParams(wmsUrl)
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
    if (queryParams['version']) {
      delete queryParams['version']
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

  static getLayers (layer) {
    const layers = []
    if (!_.isNil(layer['Layer'])) {
      for (const l of layer['Layer']) {
        layers.push(...this.getLayers(l))
      }
    } else {
      let bbox
      let extent
      let version
      if (!_.isNil(layer['LatLonBoundingBox'])) {
        bbox = layer['LatLonBoundingBox'][0]['$']
        extent = [Number(bbox['minx']), Number(bbox['miny']), Number(bbox['maxx']), Number(bbox['maxy'])]
        version = '1.1.1'
      } else {
        bbox = layer['EX_GeographicBoundingBox'][0]
        extent = [Number(bbox['westBoundLongitude']), Number(bbox['southBoundLatitude']), Number(bbox['eastBoundLongitude']), Number(bbox['northBoundLatitude'])]
        version = '1.3.0'
      }
      layers.push({name: layer['Name'][0], extent: extent, wms: true, version})
    }
    return layers
  }

  static getWMSLayersFromGetCapabilities (json) {
    let layers = []
    try {
      if (!_.isNil(json['WMT_MS_Capabilities'])) {
        const wmsCapability = json['WMT_MS_Capabilities']['Capability'][0]
        layers.push(...this.getLayers(wmsCapability))
      } else if (!_.isNil(json['WMS_Capabilities'])) {
        const wmsCapability = json['WMS_Capabilities']['Capability'][0]
        layers.push(...this.getLayers(wmsCapability))
      }
    } catch (e) {
      console.log(e)
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
