import isNil from 'lodash/isNil'
import isNaN from 'lodash/isNaN'
import uniq from 'lodash/uniq'

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
 * Explodes a flattened feature using it's container structure
 * @param container
 * @param features
 * @returns {{coordinates: *, type: *}|{geometries: *, type: *}}
 */
function explodeFlattenedFeature (container, features) {
  let geometry
  if (container.isLeaf) {
    const indexedFeature = features.find(feature => feature.properties.index === container.index)
    if (!isNil(indexedFeature)) {
      geometry = indexedFeature.geometry
    }
  } else {
    if (container.type === 'GeometryCollection') {
      let geometries = container.items.map(item => explodeFlattenedFeature(item, features))
      if (geometries.length > 0) {
        geometry = {
          type: container.type,
          geometries: geometries
        }
      }
    } else if (container.type === 'Polygon') {
      let coordinates = container.items.map(item => explodeFlattenedFeature(item, features))
      geometry = {
        type: 'Polygon',
        coordinates: coordinates.map(coordinate => coordinate.coordinates[0])
      }
    } else {
      let coordinates = container.items.map(item => explodeFlattenedFeature(item, features)).map(geometry => geometry.coordinates)
      if (coordinates.length > 0) {
        geometry = {
          type: container.type,
          coordinates: coordinates
        }
      }
    }
  }
  return geometry
}

/**
 * This will take a feature and flatten it. If it contains any multi features or geometry collections within it, they will be flattened as well
 * @param feature
 * @param indexObject
 */
function flattenFeature (feature, indexObject = {index: 0}) {
  let features = []
  // each container represents a geometry in the feature
  let container = {
    type: feature.geometry.type,
    isLeaf: false,
    items: []
  }
  switch (window.mapcache.GeometryType.fromName(feature.geometry.type.toUpperCase())) {
    case window.mapcache.GeometryType.MULTIPOINT:
    case window.mapcache.GeometryType.MULTILINESTRING:
    case window.mapcache.GeometryType.MULTIPOLYGON:
      feature.geometry.coordinates.forEach(coordinates => {
        let result = flattenFeature({
          type: 'Feature',
          geometry: {
            type: feature.geometry.type.substring(5),
            coordinates
          },
          properties: {}
        }, indexObject)
        result.features.forEach(feature => {
          features.push(feature)
        })
        container.items.push(result.container)
      })
      break
    case window.mapcache.GeometryType.GEOMETRYCOLLECTION:
      feature.geometry.geometries.forEach(geometry => {
        let result = flattenFeature({
          type: 'Feature',
          geometry: geometry,
          properties: {}
        }, indexObject)
        result.features.forEach(feature => {
          features.push(feature)
        })
        container.items.push(result.container)
      })
      break
    case window.mapcache.GeometryType.POLYGON:
      // polygon has an external ring and up to several holes.
      // split these up some...
      if (feature.geometry.coordinates.length > 1) {
        feature.geometry.coordinates.forEach(coordinates => {
          let result = flattenFeature({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [coordinates]
            },
            properties: {}
          }, indexObject)
          result.features.forEach(feature => {
            features.push(feature)
          })
          container.items.push(result.container)
        })
      } else {
        container.isLeaf = true
        container.index = indexObject.index
        feature.properties.index = indexObject.index
        features.push(feature)
        indexObject.index++
      }
      break
    default:
      container.isLeaf = true
      container.index = indexObject.index
      feature.properties.index = indexObject.index
      features.push(feature)
      indexObject.index++
      break
  }
  return {
    features,
    container
  }
}

export {
  coordinatesEqual,
  isCoordinateValid,
  isRectangle,
  flattenFeature,
  explodeFlattenedFeature,
  isValid
}
