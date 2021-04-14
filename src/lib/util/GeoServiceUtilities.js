/* eslint-disable no-empty */
import URLUtilities from './URLUtilities'
import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'
import keys from 'lodash/keys'

export default class GeoServiceUtilities {
  static supportedImageFormats = ['image/png', 'image/svg+xml', 'image/jpg', 'image/jpeg', 'image/gif', 'image/bmp', 'image/webp']

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

  static getBoundingBoxFromWMSLayer (layer) {
    let bbox
    let extent
    try {
      if (!isNil(layer['LatLonBoundingBox'])) {
        bbox = layer['LatLonBoundingBox'][0]['$']
        extent = [Number(bbox['minx']), Number(bbox['miny']), Number(bbox['maxx']), Number(bbox['maxy'])]
      } else if (!isNil(layer['EX_GeographicBoundingBox'])){
        bbox = layer['EX_GeographicBoundingBox'][0]
        extent = [Number(bbox['westBoundLongitude']), Number(bbox['southBoundLatitude']), Number(bbox['eastBoundLongitude']), Number(bbox['northBoundLatitude'])]
      }
    } catch (e) {}
    return extent
  }

  static getSRSForWMSLayer (layer, availableSrs) {
    let srs = []
    if (!isNil(layer['CRS'])) {
      srs = layer['CRS']
    } else if (!isNil(layer['SRS'])) {
      srs = layer['SRS']
    }
    return srs.filter(s => isNil(availableSrs.find(aSrs => aSrs === s)))
  }

  static getLayers (layer, version, titles = [], availableSrs = [], parentExtent = [-180, -90, 180, 90]) {
    const layers = []
    const layerSrs = availableSrs.slice()
    if (!isNil(layer['Layer'])) {
      for (const l of layer['Layer']) {
        const layerTitles = titles.slice()
        let title = null
        let name = null
        let srs = GeoServiceUtilities.getSRSForWMSLayer(l, availableSrs)
        try { title = layer['Title'][0] } catch (e) {}
        try { name = layer['Name'][0] } catch (e) {}
        if (isNil(title) || isEmpty(title)) {
          title = name
        }
        if (!isNil(title) && !isEmpty(title)) {
          layerTitles.push(title)
        }
        let extent = GeoServiceUtilities.getBoundingBoxFromWMSLayer(l) || parentExtent.slice()
        layers.push(...GeoServiceUtilities.getLayers(l, version, layerTitles, layerSrs.concat(srs), extent))
      }
    } else {
      let extent
      let title
      let name
      let has3857 = false
      const layerTitles = titles.slice()
      const supportedProjections = availableSrs.concat(GeoServiceUtilities.getSRSForWMSLayer(layer, availableSrs))
      extent = GeoServiceUtilities.getBoundingBoxFromWMSLayer(layer) || parentExtent.slice()
      try { title = layer['Title'][0] } catch (e) {}
      try { name = layer['Name'][0] } catch (e) {}
      try { has3857 = supportedProjections.findIndex(crs => crs.toUpperCase() === '3857' || crs.toUpperCase() === 'EPSG:3857') !== -1 } catch (e) {}
      if (!isNil(title) && !isEmpty(title)) {
        layerTitles.push(title)
      } else if (!isNil(name) && !isEmpty(name)) {
        layerTitles.push(name)
      }
      layers.push({name, title: layerTitles[0], subtitles: layerTitles.length > 1 ? layerTitles.slice(1) : [], extent, wms: true, version, has3857})
    }
    return layers
  }


  /**
   * Recommended format for GetMap is image/png, then image/[jpg|jpeg], then image/gif
   * @param formats
   */
  static getRecommendedFormat (formats) {
    let format
    for (let i = 0; i < GeoServiceUtilities.supportedImageFormats.length; i++) {
      const supportedFormat = GeoServiceUtilities.supportedImageFormats[i]
      if (formats.indexOf(supportedFormat) !== -1) {
        format = supportedFormat
        break
      }
    }
    return format
  }

  /**
   * Parses WMS info
   * @param json
   * @param version of this WMS GetCapabilities XML
   */
  static getWMSInfo (json, version) {
    let wmsInfo = {}
    let layers = []
    let format
    try {
      let capabilities
      if (!isNil(json['WMT_MS_Capabilities'])) {
        capabilities = json['WMT_MS_Capabilities']
      } else if (!isNil(json['WMS_Capabilities'])) {
        capabilities = json['WMS_Capabilities']
      }
      if (!isNil(capabilities)) {
        const service = capabilities['Service'][0]
        if (!isNil(service)) {
          wmsInfo.title = service['Title'] ? service['Title'][0] : ''
          wmsInfo.abstract = service['Abstract'] ? service['Abstract'][0] : ''
          try {
            const contactInformation = service['ContactInformation'][0]['ContactPersonPrimary'][0]
            wmsInfo.contactName = contactInformation['ContactPerson'][0]
            wmsInfo.contactOrg = contactInformation['ContactOrganization'][0]
          } catch (error) {}
        }
        const wmsCapability = capabilities['Capability']
        if (!isNil(wmsCapability)) {
          const request = wmsCapability[0]['Request']
          if (!isNil(request)) {
           const getMap = request[0]['GetMap']
            if (!isNil(getMap) && !isNil(getMap[0]['Format'])) {
              format = GeoServiceUtilities.getRecommendedFormat(getMap[0]['Format'])
            }
          }
          layers.push(...GeoServiceUtilities.getLayers(wmsCapability[0], version))
        }
      }
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to process WMS GetCapabilities.')
    }
    wmsInfo.layers = layers.filter(layer => layer.has3857)
    wmsInfo.unsupportedLayers = layers.filter(layer => !layer.has3857)
    wmsInfo.format = format
    return wmsInfo
  }

  static getLayerOutputFormat (layer) {
    const geoJSONSupported = !isNil(layer.outputFormats.find(f => f.toLowerCase() === 'application/json' || f.toLowerCase() === 'json'))
    const gml2Supported = !isNil(layer.outputFormats.find(f => f.toUpperCase() === 'GML2' || f.toLowerCase().startsWith('text/xml; subtype=gml/2')))
    const gml3Supported = !isNil(layer.outputFormats.find(f => f.toUpperCase() === 'GML3' || f.toLowerCase().startsWith('text/xml; subtype=gml/3.1')))
    const gml32Supported = !isNil(layer.outputFormats.find(f => f.toUpperCase() === 'GML32' || f.toLowerCase().startsWith('text/xml; subtype=gml/3.2')))

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
    if (isNil(outputFormat)) {
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

  /**
   * Returns WFS info
   * @param json
   * @param version
   */
  static getWFSInfo (json, version) {
    let wfsInfo = {}
    let layers = []
    let outputFormats = ['application/json']
    try {
      if (!isNil(json['WFS_Capabilities'])) {
        try {
          const service = json['WFS_Capabilities']['Service'][0]
          if (!isNil(service)) {
            wfsInfo.title = service['Title'][0]
            const contactInformation = service['ContactInformation'][0]['ContactPersonPrimary'][0]
            wfsInfo.contactName = contactInformation['ContactPerson'][0]
            wfsInfo.contactOrg = contactInformation['ContactOrganization'][0]
            wfsInfo.abstract = service['Abstract'][0]
          }
        } catch (error) {}
        try {
          const capability = json['WFS_Capabilities']['Capability'][0]['Request'][0]
          if (!isNil(capability) && !isNil(capability['GetFeature'])) {
            const getFeatureOp = capability['GetFeature'][0]
            if (!isNil(getFeatureOp) && !isNil(getFeatureOp['ResultFormat'])) {
              const featureOutputFormats = keys(getFeatureOp['ResultFormat'][0])
              if (!isNil(featureOutputFormats)) {
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
          let title = !isNil(layer['Title']) ? layer['Title'][0] : name
          if (!isNil(layer['OutputFormats'])) {
            outputFormats = layer['OutputFormats'].map(format => format['Format'][0])
          }
          if (isNil(title) || isEmpty(title)) {
            title = name
          }
          let defaultSRS = !isNil(layer['SRS']) ? layer['SRS'][0] : ''
          const otherSRS = []
          layers.push({name, title: title, subtitles: [], extent, wfs: true, defaultSRS: defaultSRS, otherSRS: otherSRS, version: version, outputFormats, geoJSONSupported: !isNil(outputFormats.find(f => f === 'application/json'))})
        }
      } else if (!isNil(json['wfs:WFS_Capabilities'])) {
        let outputFormats = ['application/json']
        try {
          const service = json['wfs:WFS_Capabilities']['Service'][0]
          if (!isNil(service)) {
            wfsInfo.title = service['Title'][0]
            const contactInformation = service['ContactInformation'][0]['ContactPersonPrimary'][0]
            wfsInfo.contactName = contactInformation['ContactPerson'][0]
            wfsInfo.contactOrg = contactInformation['ContactOrganization'][0]
            wfsInfo.abstract = service['Abstract'][0]
          }
        } catch (error) {}
        try {
          const operationMetadata = json['wfs:WFS_Capabilities']['ows:OperationsMetadata'][0]
          if (!isNil(operationMetadata)) {
            const getFeatureOp = operationMetadata['ows:Operation'].find(operation => operation['$']['name'] === 'GetFeature')
            if (!isNil(getFeatureOp) && !isNil(getFeatureOp['ows:Parameter'])) {
              const featureOutputFormats = getFeatureOp['ows:Parameter'].find(param => param['$']['name'] === 'outputFormat')
              if (!isNil(featureOutputFormats)) {
                outputFormats = featureOutputFormats['ows:AllowedValues'][0]['ows:Value']
              }
            }
          }
        } catch (error) {}
        const capabilites = json['wfs:WFS_Capabilities']
        let featureTypeList
        if (!isNil(capabilites['wfs:FeatureTypeList'])) {
          featureTypeList = json['wfs:WFS_Capabilities']['wfs:FeatureTypeList'][0]['wfs:FeatureType']
        } else {
          featureTypeList = json['wfs:WFS_Capabilities']['FeatureTypeList'][0]['FeatureType']
        }
        for (const layer of featureTypeList) {
          const bbox = layer['ows:WGS84BoundingBox'][0]
          const lowerCorner = bbox['ows:LowerCorner'][0].split(' ')
          const upperCorner = bbox['ows:UpperCorner'][0].split(' ')
          if (!isNil(layer['OutputFormats'])) {
            outputFormats = layer['OutputFormats'].map(format => format['Format'][0])
          }
          const extent = [Number(lowerCorner[0]), Number(lowerCorner[1]), Number(upperCorner[0]), Number(upperCorner[1])]
          const name = !isNil(layer['wfs:Name']) ? layer['wfs:Name'][0] : layer['Name'][0]
          let defaultSRS = !isNil(layer['wfs:DefaultSRS']) ? layer['wfs:DefaultSRS'][0] : (!isNil(layer['DefaultSRS']) ? layer['DefaultSRS'][0] : '')
          if (isEmpty(defaultSRS)) {
            defaultSRS = !isNil(layer['wfs:DefaultCRS']) ? layer['wfs:DefaultCRS'][0] : (!isNil(layer['DefaultCRS']) ? layer['DefaultCRS'][0] : '')
          }
          const otherSRS = !isNil(layer['wfs:OtherSRS']) ? layer['wfs:OtherSRS'] : (!isNil(layer['OtherSRS']) ? layer['OtherSRS'] : [])
          let title = !isNil(layer['wfs:Title']) ? layer['wfs:Title'][0] : (!isNil(layer['Title']) ? layer['Title'][0] : name)
          if (isNil(title) || isEmpty(title)) {
            title = name
          }
          layers.push({name, title: title, subtitles: [], extent, wfs: true, defaultSRS: defaultSRS, otherSRS: otherSRS, version: version, outputFormats, geoJSONSupported: !isNil(outputFormats.find(f => f === 'application/json'))})
        }
      }
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to process WFS GetCapabilities.')
    }
    wfsInfo.layers = layers
    return wfsInfo
  }

  static getTileRequestURL (wmsUrl, layers, width, height, bbox, referenceSystemName, version, format) {
    let {baseUrl, queryParams} = URLUtilities.getBaseUrlAndQueryParams(wmsUrl)
    if (queryParams['service']) {
      delete queryParams['service']
    }
    queryParams['request'] = 'GetMap'
    queryParams['version'] = version
    queryParams['layers'] = layers.join()
    queryParams['width'] = width
    queryParams['height'] = height
    queryParams['format'] = format
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
