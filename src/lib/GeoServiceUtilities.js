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

  static getWFSVersionFromGetCapabilities (json) {
    let version = null
    if (!_.isNil(json['WFS_Capabilities'])) {
      version = json['WFS_Capabilities']['$']['version']
    } else if (!_.isNil(json['wfs:WFS_Capabilities'])) {
      version = json['wfs:WFS_Capabilities']['$']['version']
    }
    return version
  }

  static getLayerOutputFormat (layer) {
    const geoJSONSupported = !_.isNil(layer.outputFormats.find(f => f.toLowerCase() === 'application/json' || f.toLowerCase() === 'json'))
    const gml2Supported = !_.isNil(layer.outputFormats.find(f => f.toUpperCase() === 'GML2' || f.toLowerCase().startsWith('text/xml; subtype=gml/2')))
    const gml3Supported = !_.isNil(layer.outputFormats.find(f => f.toUpperCase() === 'GML3' || f.toLowerCase().startsWith('text/xml; subtype=gml/3.1')))
    const gml32Supported = !_.isNil(layer.outputFormats.find(f => f.toUpperCase() === 'GML32' || f.toLowerCase().startsWith('text/xml; subtype=gml/3.2')))

    let outputFormat
    if (geoJSONSupported) {
      outputFormat = 'application/json'
    } else if (gml32Supported) {
      outputFormat = 'GML32'
    } else if (gml3Supported) {
      outputFormat = 'GML3'
    } else if (gml2Supported) {
      outputFormat = 'GML2'
    }

    // output format not found in capabilities document, use default for version
    if (_.isNil(outputFormat)) {
      if (layer.version === '1.0.0') {
        outputFormat = 'GML2'
      } else if (layer.version === '1.1.0') {
        outputFormat = 'GML3'
      } else {
        outputFormat = 'GML32'
      }
    }
    return outputFormat
  }

  static getWFSInfo (json) {
    let wfsInfo = {}
    let layers = []
    let outputFormats = ['application/json']
    try {
      if (!_.isNil(json['WFS_Capabilities'])) {
        try {
          const service = json['WFS_Capabilities']['Service'][0]
          if (!_.isNil(service)) {
            wfsInfo.title = service['Title'][0]
            const contactInformation = service['ContactInformation'][0]['ContactPersonPrimary'][0]
            wfsInfo.contactName = contactInformation['ContactPerson'][0]
            wfsInfo.contactOrg = contactInformation['ContactOrganization'][0]
            wfsInfo.abstract = service['Abstract'][0]
          }
        } catch (error) {}
        try {
          const capability = json['WFS_Capabilities']['Capability'][0]['Request'][0]
          if (!_.isNil(capability) && !_.isNil(capability['GetFeature'])) {
            const getFeatureOp = capability['GetFeature'][0]
            if (!_.isNil(getFeatureOp) && !_.isNil(getFeatureOp['ResultFormat'])) {
              const featureOutputFormats = _.keys(getFeatureOp['ResultFormat'][0])
              if (!_.isNil(featureOutputFormats)) {
                outputFormats = featureOutputFormats.map(key => {
                  let mime = ''
                  switch (key) {
                    case 'JSON':
                      mime = 'application/json'
                      break
                    case 'GML2':
                      mime = 'GML2'
                      break
                    case 'GML3':
                      mime = 'GML3'
                      break
                    case 'CSV':
                      mime = 'csv'
                      break
                    case 'SHAPE-ZIP':
                      mime = 'shape-zip'
                      break
                    default:
                      break
                  }
                  return mime
                }).filter(val => val !== '')
              }
            }
          }
        } catch (error) {}
        for (const layer of json['WFS_Capabilities']['FeatureTypeList'][0]['FeatureType']) {
          const bbox = layer['LatLongBoundingBox'][0]['$']
          const extent = [Number(bbox['minx']), Number(bbox['miny']), Number(bbox['maxx']), Number(bbox['maxy'])]
          const name = layer['Name'][0]
          let title = !_.isNil(layer['Title']) ? layer['Title'][0] : name
          if (!_.isNil(layer['OutputFormats'])) {
            outputFormats = layer['OutputFormats'].map(format => format['Format'][0])
          }
          if (_.isNil(title) || _.isEmpty(title)) {
            title = name
          }
          let defaultSRS = !_.isNil(layer['SRS']) ? layer['SRS'][0] : ''
          const otherSRS = []
          layers.push({name, title: title, subtitles: [], extent, wfs: true, defaultSRS: defaultSRS, otherSRS: otherSRS, version: this.getWFSVersionFromGetCapabilities(json), outputFormats, geoJSONSupported: !_.isNil(outputFormats.find(f => f === 'application/json'))})
        }
      } else if (!_.isNil(json['wfs:WFS_Capabilities'])) {
        let outputFormats = ['application/json']
        try {
          const service = json['wfs:WFS_Capabilities']['Service'][0]
          if (!_.isNil(service)) {
            wfsInfo.title = service['Title'][0]
            const contactInformation = service['ContactInformation'][0]['ContactPersonPrimary'][0]
            wfsInfo.contactName = contactInformation['ContactPerson'][0]
            wfsInfo.contactOrg = contactInformation['ContactOrganization'][0]
            wfsInfo.abstract = service['Abstract'][0]
          }
        } catch (error) {}
        try {
          const operationMetadata = json['wfs:WFS_Capabilities']['ows:OperationsMetadata'][0]
          if (!_.isNil(operationMetadata)) {
            const getFeatureOp = operationMetadata['ows:Operation'].find(operation => operation['$']['name'] === 'GetFeature')
            if (!_.isNil(getFeatureOp) && !_.isNil(getFeatureOp['ows:Parameter'])) {
              const featureOutputFormats = getFeatureOp['ows:Parameter'].find(param => param['$']['name'] === 'outputFormat')
              if (!_.isNil(featureOutputFormats)) {
                outputFormats = featureOutputFormats['ows:AllowedValues'][0]['ows:Value']
              }
            }
          }
        } catch (error) {}
        const capabilites = json['wfs:WFS_Capabilities']
        let featureTypeList
        if (!_.isNil(capabilites['wfs:FeatureTypeList'])) {
          featureTypeList = json['wfs:WFS_Capabilities']['wfs:FeatureTypeList'][0]['wfs:FeatureType']
        } else {
          featureTypeList = json['wfs:WFS_Capabilities']['FeatureTypeList'][0]['FeatureType']
        }
        for (const layer of featureTypeList) {
          const bbox = layer['ows:WGS84BoundingBox'][0]
          const lowerCorner = bbox['ows:LowerCorner'][0].split(' ')
          const upperCorner = bbox['ows:UpperCorner'][0].split(' ')
          if (!_.isNil(layer['OutputFormats'])) {
            outputFormats = layer['OutputFormats'].map(format => format['Format'][0])
          }
          const extent = [Number(lowerCorner[0]), Number(lowerCorner[1]), Number(upperCorner[0]), Number(upperCorner[1])]
          const name = !_.isNil(layer['wfs:Name']) ? layer['wfs:Name'][0] : layer['Name'][0]
          let defaultSRS = !_.isNil(layer['wfs:DefaultSRS']) ? layer['wfs:DefaultSRS'][0] : (!_.isNil(layer['DefaultSRS']) ? layer['DefaultSRS'][0] : '')
          if (_.isEmpty(defaultSRS)) {
            defaultSRS = !_.isNil(layer['wfs:DefaultCRS']) ? layer['wfs:DefaultCRS'][0] : (!_.isNil(layer['DefaultCRS']) ? layer['DefaultCRS'][0] : '')
          }
          const otherSRS = !_.isNil(layer['wfs:OtherSRS']) ? layer['wfs:OtherSRS'] : (!_.isNil(layer['OtherSRS']) ? layer['OtherSRS'] : [])
          let title = !_.isNil(layer['wfs:Title']) ? layer['wfs:Title'][0] : (!_.isNil(layer['Title']) ? layer['Title'][0] : name)
          if (_.isNil(title) || _.isEmpty(title)) {
            title = name
          }
          layers.push({name, title: title, subtitles: [], extent, wfs: true, defaultSRS: defaultSRS, otherSRS: otherSRS, version: this.getWFSVersionFromGetCapabilities(json), outputFormats, geoJSONSupported: !_.isNil(outputFormats.find(f => f === 'application/json'))})
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
    wfsInfo.layers = layers
    return wfsInfo
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
    queryParams['styles'] = ''
    return URLUtilities.generateUrlWithQueryParams(baseUrl, queryParams)
  }

  static getFeatureRequestURL (wfsUrl, layer, outputFormat, referenceSystemName, version) {
    let {baseUrl, queryParams} = URLUtilities.getBaseUrlAndQueryParams(wfsUrl)
    if (queryParams['service']) {
      delete queryParams['service']
    }
    queryParams['service'] = 'WFS'
    if (version === '2.0.0') {
      queryParams['typeNames'] = layer
    } else {
      queryParams['typeName'] = layer
    }
    queryParams['outputFormat'] = outputFormat
    queryParams['request'] = 'GetFeature'
    queryParams['version'] = version
    if (referenceSystemName !== null) {
      queryParams['srsName'] = referenceSystemName
    }
    return URLUtilities.generateUrlWithQueryParams(baseUrl, queryParams)
  }
}
