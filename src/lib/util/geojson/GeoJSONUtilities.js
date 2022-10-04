import isNil from 'lodash/isNil'
import isNaN from 'lodash/isNaN'
import uniq from 'lodash/uniq'
import bboxClip from '@turf/bbox-clip'
import bbox from '@turf/bbox'
import bboxPolygon from '@turf/bbox-polygon'
import intersect from '@turf/intersect'
import circle from '@turf/circle'

/**
 * Generates a circular polygon feature with a specified number of vertices
 * @param latLng
 * @param properties
 * @param radiusInMeters
 * @param steps
 * @returns {Feature<Polygon, Properties>}
 */
function generateCircularFeature (latLng, properties, radiusInMeters, steps = 128) {
  return circle(latLng, radiusInMeters, {steps: steps, units: 'meters', properties: properties})
}

/**
 * Returns a clipped feature. Will return null of there is no intersection between the bounds and the feature
 * @param feature
 * @param clippingBounds
 * @returns {Feature<LineString, {}> | Feature<MultiLineString, {}> | Feature<Polygon, {}> | Feature<MultiPolygon, {}>}
 */
function clipFeature (feature, clippingBounds) {
  let clippedFeature = null
  try {
    const featureBounds = bbox(feature)
    if (intersect(bboxPolygon(featureBounds), bboxPolygon(clippingBounds))) {
      clippedFeature = bboxClip(feature, clippingBounds)
    }
    // eslint-disable-next-line no-empty, no-unused-vars
  } catch (e) {}
  return clippedFeature
}

function isRectangle (geometry) {
  let isRect = false
  if (geometry.type === 'Polygon' && geometry.coordinates.length === 1 && geometry.coordinates[0].length === 5) {
    const longitudes = uniq(geometry.coordinates[0].map(coordinate => coordinate[0]))
    const latitudes = uniq(geometry.coordinates[0].map(coordinate => coordinate[1]))
    if (longitudes.length === 2 && latitudes.length === 2) {
      isRect = true
    }
  }
  return isRect
}

function coordinatesEqual (c1, c2) {
  let equal = false
  try {
    equal = c1.length === c2.length && c1[0] === c2[0] && c1[1] === c2[1]
    if (equal && c1.length === 3) {
      equal = equal && c1[2] === c2[2]
    }
  } catch (e) {
    equal = false
  }
  return equal
}

function isCoordinateValid (coordinate) {
  let valid
  try {
    if (coordinate.length === 2) {
      valid = !isNaN(coordinate[0]) && !isNil(coordinate[0]) && !isNaN(coordinate[1]) && !isNil(coordinate[1])
    } else if (coordinate.length === 3) {
      valid = !isNaN(coordinate[0]) && !isNil(coordinate[0]) && !isNaN(coordinate[1]) && !isNil(coordinate[1]) && !isNaN(coordinate[2]) && !isNil(coordinate[2])
    }
  } catch (e) {
    valid = false
  }
  return valid
}

/**
 * Simple GeoJSON Validation, verifies all the coordinates are valid
 * @param geometry
 * @return {boolean}
 */
function isValid (geometry) {
  let valid = true
  try {
    switch (geometry.type.toLowerCase()) {
      case 'point':
        valid = isCoordinateValid(geometry.coordinates)
        break
      case 'linestring':
        valid = geometry.coordinates.length >= 2
        for (let i = 0; i < geometry.coordinates.length && valid; i++) {
          valid = valid && isCoordinateValid(geometry.coordinates[i])
        }
        break
      case 'polygon':
        for (let i = 0; i < geometry.coordinates.length && valid; i++) {
          valid = geometry.coordinates[i].length >= 4 && coordinatesEqual(geometry.coordinates[i][0], geometry.coordinates[i][geometry.coordinates[0].length - 1])
          for (let j = 0; j < geometry.coordinates[i].length && valid; j++) {
            valid = valid && isCoordinateValid(geometry.coordinates[i][j])
          }
        }
        break
      case 'multipoint':
        for (let i = 0; i < geometry.coordinates.length && valid; i++) {
          valid = valid && isCoordinateValid(geometry.coordinates[i])
        }
        break
      case 'multilinestring':
        for (let i = 0; i < geometry.coordinates.length && valid; i++) {
          valid = geometry.coordinates[i].length >= 2
          for (let j = 0; j < geometry.coordinates[i].length && valid; j++) {
            valid = valid && isCoordinateValid(geometry.coordinates[i][j])
          }
        }
        break
      case 'multipolygon':
        for (let i = 0; i < geometry.coordinates.length && valid; i++) {
          for (let j = 0; j < geometry.coordinates[i].length && valid; j++) {
            valid = geometry.coordinates[i][j].length >= 4 && coordinatesEqual(geometry.coordinates[i][j][0], geometry.coordinates[i][j][geometry.coordinates[0].length - 1])
            for (let k = 0; k < geometry.coordinates[i][j].length && valid; k++) {
              valid = valid && isCoordinateValid(geometry.coordinates[i][j][k])
            }
          }
        }
        break
      case 'geometrycollection':
        for (let i = 0; i < geometry.geometries.length && valid; i++) {
          valid = valid && isValid(geometry.geometries[i])
        }
        break
    }
  } catch (e) {
    valid = false
  }
  return valid
}

/**
 * Unflattens a list of features
 * @param features
 * @returns any
 */
function explodeFlattenedFeature (features) {
  let geometry = null
  if (features.length === 1) {
    geometry = features[0].geometry
  } else if (features.length > 1) {
    const featureTypes = features.map(feature => feature.geometry.type)
    const isMultiPoint = featureTypes.filter(type => type === 'Point').length === featureTypes.length
    const isMultiLineString = featureTypes.filter(type => type === 'LineString').length === featureTypes.length
    const isMultiPolygon = featureTypes.filter(type => type === 'Polygon').length === featureTypes.length
    if (isMultiPoint) {
      geometry = {
        type: 'MultiPoint',
        coordinates: features.map(feature => feature.geometry.coordinates)
      }
    } else if (isMultiLineString) {
      geometry = {
        type: 'MultiLineString',
        coordinates: features.map(feature => feature.geometry.coordinates)
      }
    } else if (isMultiPolygon) {
      geometry = {
        type: 'MultiPolygon',
        coordinates: features.map(feature => feature.geometry.coordinates)
      }
    } else {
      geometry = {
        type: 'GeometryCollection',
        geometries: features.map(feature => feature.geometry)
      }
    }
  }

  return geometry
}

/**
 * Takes a feature and flattens it into an array of features
 * Realistically, this just looks for GeometryCollections and creates a list of features for that collection
 * @param feature
 */
function flattenFeature (feature) {
  let features = []
  if (feature.geometry != null) {
    switch (window.mapcache.GeometryType.fromName(feature.geometry.type.toUpperCase())) {
      case window.mapcache.GeometryType.MULTIPOINT:
      case window.mapcache.GeometryType.MULTILINESTRING:
      case window.mapcache.GeometryType.MULTIPOLYGON:
        feature.geometry.coordinates.forEach(coordinates => {
          flattenFeature({
            type: 'Feature',
            geometry: {
              type: feature.geometry.type.substring(5),
              coordinates
            },
            properties: {}
          }).forEach(feature => {
            features.push(feature)
          })
        })
        break
      case window.mapcache.GeometryType.GEOMETRYCOLLECTION:
        feature.geometry.geometries.forEach(geometry => {
          let result = flattenFeature({
            type: 'Feature',
            geometry: geometry,
            properties: {}
          })
          result.forEach(feature => {
            features.push(feature)
          })
        })
        break
      default:
        features.push(feature)
        break
    }
  }
  return features
}

export {
  generateCircularFeature,
  coordinatesEqual,
  isCoordinateValid,
  isRectangle,
  flattenFeature,
  explodeFlattenedFeature,
  isValid,
  clipFeature
}
