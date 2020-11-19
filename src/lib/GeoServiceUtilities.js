/* eslint-disable no-empty */
import URLUtilities from './URLUtilities'
import _ from 'lodash'
export default class GeoServiceUtilities {
  // get the GetCapabilities URL
  static getGetCapabilitiesURL (wmsUrl, version, service) {
    let {baseUrl, queryParams} = URLUtilities.getBaseUrlAndQueryParams(wmsUrl)
    queryParams['request'] = 'GetCapabilities'
    queryParams['version'] = version
    queryParams['service'] = service
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

  static getLayers (layer, titles = []) {
    const layers = []
    if (!_.isNil(layer['Layer'])) {
      for (const l of layer['Layer']) {
        const layerTitles = titles.slice()
        let title = null
        let name = null
        try { title = layer['Title'][0] } catch (e) {}
        try { name = layer['Name'][0] } catch (e) {}
        if (_.isNil(title) || _.isEmpty(title)) {
          title = name
        }
        if (!_.isNil(title) && !_.isEmpty(title)) {
          layerTitles.push(title)
        }
        layers.push(...this.getLayers(l, layerTitles))
      }
    } else {
      let bbox
      let extent
      let version
      let title
      let name
      let has3857 = false
      const layerTitles = titles.slice()
      if (!_.isNil(layer['LatLonBoundingBox'])) {
        bbox = layer['LatLonBoundingBox'][0]['$']
        extent = [Number(bbox['minx']), Number(bbox['miny']), Number(bbox['maxx']), Number(bbox['maxy'])]
        version = '1.1.1'
        try { title = layer['Title'][0] } catch (e) {}
        try { name = layer['Name'][0] } catch (e) {}
        try { has3857 = layer['CRS'].findIndex(crs => crs.toUpperCase() === '3857' || crs.toUpperCase() === 'EPSG:3857') !== -1 } catch (e) {}
      } else {
        bbox = layer['EX_GeographicBoundingBox'][0]
        extent = [Number(bbox['westBoundLongitude']), Number(bbox['southBoundLatitude']), Number(bbox['eastBoundLongitude']), Number(bbox['northBoundLatitude'])]
        version = '1.3.0'
        try { title = layer['Title'][0] } catch (e) {}
        try { name = layer['Name'][0] } catch (e) {}
        try { has3857 = layer['CRS'].findIndex(crs => crs.toUpperCase() === '3857' || crs.toUpperCase() === 'EPSG:3857') !== -1 } catch (e) {}
      }
      if (!_.isNil(title) && !_.isEmpty(title)) {
        layerTitles.push(title)
      } else if (!_.isNil(name) && !_.isEmpty(name)) {
        layerTitles.push(name)
      }
      layers.push({name, title: layerTitles[0], subtitles: layerTitles.length > 1 ? layerTitles.slice(1) : [], extent, wms: true, version, has3857})
    }
    return layers
  }

  static getWMSInfo (json) {
    let wmsInfo = {}
    let layers = []
    try {
      if (!_.isNil(json['WMT_MS_Capabilities'])) {
        const service = json['WMT_MS_Capabilities']['Service'][0]
        wmsInfo.title = service['Title'][0]
        wmsInfo.abstract = service['Abstract'][0]
        try {
          const contactInformation = service['ContactInformation'][0]['ContactPersonPrimary'][0]
          wmsInfo.contactName = contactInformation['ContactPerson'][0]
          wmsInfo.contactOrg = contactInformation['ContactOrganization'][0]
        } catch (error) {}
        const wmsCapability = json['WMT_MS_Capabilities']['Capability'][0]
        layers.push(...this.getLayers(wmsCapability))
      } else if (!_.isNil(json['WMS_Capabilities'])) {
        const service = json['WMS_Capabilities']['Service'][0]
        wmsInfo.title = service['Title'][0]
        wmsInfo.abstract = service['Abstract'][0]
        try {
          const contactInformation = service['ContactInformation'][0]['ContactPersonPrimary'][0]
          wmsInfo.contactName = contactInformation['ContactPerson'][0]
          wmsInfo.contactOrg = contactInformation['ContactOrganization'][0]
        } catch (error) {}
        const wmsCapability = json['WMS_Capabilities']['Capability'][0]
        layers.push(...this.getLayers(wmsCapability))
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
    wmsInfo.layers = layers.filter(layer => layer.has3857)
    wmsInfo.unsupportedLayers = layers.filter(layer => !layer.has3857)
    return wmsInfo
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
      // eslint-disable-next-line no-console
      console.error(e)
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

  static getWFSInfo (json) {
    let wfsInfo = {}
    let layers = []
    try {
      if (!_.isNil(json['WFS_Capabilities'])) {
        try {
          const service = json['WFS_Capabilities']['Service'][0]
          wfsInfo.title = service['Title'][0]
          const contactInformation = service['ContactInformation'][0]['ContactPersonPrimary'][0]
          wfsInfo.contactName = contactInformation['ContactPerson'][0]
          wfsInfo.contactOrg = contactInformation['ContactOrganization'][0]
          wfsInfo.abstract = service['Abstract'][0]
        } catch (error) {}
        for (const layer of json['WFS_Capabilities']['FeatureTypeList'][0]['FeatureType']) {
          const bbox = layer['LatLongBoundingBox'][0]['$']
          const extent = [Number(bbox['minx']), Number(bbox['miny']), Number(bbox['maxx']), Number(bbox['maxy'])]
          const name = layer['Name'][0]
          let title = !_.isNil(layer['Title']) ? layer['Title'][0] : name
          if (_.isNil(title) || _.isEmpty(title)) {
            title = name
          }
          layers.push({name, title: title, subtitles: [], extent, wfs: true, version: this.getWFSVersionFromGetCapabilities(json)})
        }
      } else if (!_.isNil(json['wfs:WFS_Capabilities'])) {
        try {
          const service = json['wfs:WFS_Capabilities']['Service'][0]
          wfsInfo.title = service['Title'][0]
          const contactInformation = service['ContactInformation'][0]['ContactPersonPrimary'][0]
          wfsInfo.contactName = contactInformation['ContactPerson'][0]
          wfsInfo.contactOrg = contactInformation['ContactOrganization'][0]
          wfsInfo.abstract = service['Abstract'][0]
        } catch (error) {}
        for (const layer of json['wfs:WFS_Capabilities']['FeatureTypeList'][0]['FeatureType']) {
          const bbox = layer['ows:WGS84BoundingBox'][0]
          const lowerCorner = bbox['ows:LowerCorner'][0].split(' ')
          const upperCorner = bbox['ows:UpperCorner'][0].split(' ')
          const extent = [Number(lowerCorner[0]), Number(lowerCorner[1]), Number(upperCorner[0]), Number(upperCorner[1])]
          const name = layer['Name'][0]
          let title = !_.isNil(layer['Title']) ? layer['Title'][0] : name
          if (_.isNil(title) || _.isEmpty(title)) {
            title = name
          }
          layers.push({name, title: title, subtitles: [], extent, wfs: true, version: this.getWFSVersionFromGetCapabilities(json)})
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
    wfsInfo.layers = layers
    return wfsInfo
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

  static getTileRequestURL (wmsUrl, layers, width, height, bbox, referenceSystemName, version) {
    let {baseUrl, queryParams} = URLUtilities.getBaseUrlAndQueryParams(wmsUrl)
    if (queryParams['service']) {
      delete queryParams['service']
    }
    queryParams['request'] = 'GetMap'
    queryParams['version'] = version
    queryParams['layers'] = layers.join()
    queryParams['width'] = width
    queryParams['height'] = height
    queryParams['format'] = 'image/png'
    queryParams['transparent'] = 'true'
    queryParams[referenceSystemName] = 'EPSG:3857'
    queryParams['bbox'] = bbox
    return URLUtilities.generateUrlWithQueryParams(baseUrl, queryParams)
  }

  static getFeatureRequestURL (wfsUrl, layer, outputFormat, referenceSystemName, version) {
    let {baseUrl, queryParams} = URLUtilities.getBaseUrlAndQueryParams(wfsUrl)
    if (queryParams['service']) {
      delete queryParams['service']
    }
    queryParams['request'] = 'GetFeature'
    queryParams['typeNames'] = layer
    queryParams['version'] = version
    queryParams['outputFormat'] = outputFormat
    queryParams['srsName'] = referenceSystemName
    return URLUtilities.generateUrlWithQueryParams(baseUrl, queryParams)
  }
}
