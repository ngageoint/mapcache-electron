import { addTransformation } from '../../projection/OpenLayersProjectionUtilities'
import isNil from 'lodash/isNil'
import {getLayerOutputFormat, isGeoJSON, isGML3, isGML32, isGML2} from '../geoserver/GeoServiceUtilities'
import GeoJSON from 'ol-format-node/format/GeoJSON'
import WFS from 'ol-format-node/format/WFS'
import GML32 from 'ol-format-node/format/GML32'
import GML3 from 'ol-format-node/format/GML3'
import GML2 from 'ol-format-node/format/GML2'

/**
 * Parse WFS GetFeature response into GeoJSON
 * Supports WFS 1.0.0, 1.1.0 and 2.0.0
 * Supports GeoJSON, GML2, and GML3 and GML32
 * @param layer
 * @param layerData
 * @returns any
 */
function convertWFSToGeoJSON (layer, layerData) {
  let outputFormat = getLayerOutputFormat(layer).toLowerCase()

  let srs = layer.defaultSRS
  const otherSrs = layer.otherSRS.find(s => s.endsWith(':4326'))
  if (otherSrs) {
    srs = otherSrs
  }
  const options = {}
  // if data is already in 4326, no need to specify a projection
  if (!srs.endsWith(':4326')) {
    addTransformation(srs, 'EPSG:4326')
    options.featureProjection = 'EPSG:4326'
    options.dataProjection = srs
  }

  let featureCollection
  let features = {}
  if (isGeoJSON(outputFormat)) {
    features = new GeoJSON().readFeatures(JSON.parse(layerData), options)
  } else if (isGML32(outputFormat)) {
    features = new WFS({gmlFormat: new GML32(), version: layer.version}).readFeatures(layerData, options)
  } else if (isGML3(outputFormat)) {
    features = new WFS({gmlFormat: new GML3(), version: layer.version}).readFeatures(layerData, options)
  } else if (isGML2(outputFormat)) {
    features = new WFS({gmlFormat: new GML2(), version: layer.version}).readFeatures(layerData, options)
  } else {
    throw new Error('Service in unsupported WFS format: ' + outputFormat)
  }
  featureCollection = new GeoJSON().writeFeaturesObject(features)

  if (isNil(featureCollection) || isNil(featureCollection.features)) {
    throw new Error('Error retrieving features.')
  }
  return featureCollection.features.filter(f => f !== undefined)
}

export {
  convertWFSToGeoJSON
}
