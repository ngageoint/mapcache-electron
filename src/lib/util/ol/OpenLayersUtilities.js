import { addTransformation } from '../../projection/OpenLayersProjectionUtilities'
import isNil from 'lodash/isNil'
import {
  getLayerOutputFormat,
  isGeoJSON,
  isGML3,
  isGML32,
  isGML2
} from '../geoserver/GeoServiceUtilities'
import { 
  GeoJSON,
  WFS,
  GML32,
  GML2
 } from '@ngageoint/ol-format-node/format'
import {
  COLON_DELIMITER,
  WORLD_GEODETIC_SYSTEM,
  WORLD_GEODETIC_SYSTEM_CODE,
} from '../../projection/ProjectionConstants'

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
  const otherSrs = layer.otherSRS.find(s => s.endsWith(COLON_DELIMITER + WORLD_GEODETIC_SYSTEM_CODE))
  if (otherSrs) {
    srs = otherSrs
  }
  const options = {}

  // if data is already in 4326, no need to specify a projection
  if (!srs.endsWith(COLON_DELIMITER + WORLD_GEODETIC_SYSTEM_CODE)) {
    addTransformation(srs, WORLD_GEODETIC_SYSTEM)
    options.featureProjection = WORLD_GEODETIC_SYSTEM
    options.dataProjection = srs
  }

  let featureCollection
  let features = {}

  if (isGeoJSON(outputFormat)) {
    features = new GeoJSON().readFeatures(JSON.parse(layerData), options)
  } else if (isGML32(outputFormat)) {
    features = new WFS({ gmlFormat: new GML32(), version: layer.version }).readFeatures(layerData, options)
    // if no features were returned, try using gml3 with the response
    if (features == null || features.length === 0) {
      try {
        features = new WFS({ gmlFormat: new GML3() }).readFeatures(layerData, options)
        // eslint-disable-next-line no-empty, no-unused-vars
      } catch (e) {}
    }
  } else if (isGML3(outputFormat)) {
    features = new WFS({ gmlFormat: new GML3(), version: layer.version }).readFeatures(layerData, options)
  } else if (isGML2(outputFormat)) {
    try {
    features = new WFS({ gmlFormat: new GML2(), version: layer.version }).readFeatures(layerData, options)
    } catch (e) {
      console.log("OpenLayersUtilities unable to parse and create WFS object from layer data")
    }
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
