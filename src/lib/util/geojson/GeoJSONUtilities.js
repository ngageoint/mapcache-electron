import isNil from 'lodash/isNil'
import uniq from 'lodash/uniq'

function isRectangle (geometry) {
  let isRect = false
  if (geometry.coordinates[0].length === 5) {
    const longitudes = uniq(geometry.coordinates[0].map(coordinate => coordinate[0]))
    const latitudes = uniq(geometry.coordinates[0].map(coordinate => coordinate[1]))
    if (longitudes.length === 2 && latitudes.length === 2) {
      isRect = true
    }
  }
  return isRect
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
      let geometries = container.items.map(item => this.explodeFlattenedFeature(item, features))
      if (geometries.length > 0) {
        geometry = {
          type: container.type,
          geometries: geometries
        }
      }
    } else if (container.type === 'Polygon') {
      let coordinates = container.items.map(item => this.explodeFlattenedFeature(item, features))
      geometry = {
        type: 'Polygon',
        coordinates: coordinates.map(coordinate => coordinate.coordinates[0])
      }
    } else {
      let coordinates = container.items.map(item => this.explodeFlattenedFeature(item, features)).map(geometry => geometry.coordinates)
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
  isRectangle,
  flattenFeature,
  explodeFlattenedFeature
}
