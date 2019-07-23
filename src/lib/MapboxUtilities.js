import {circle, polygonToLine, polygon} from '@turf/turf'

export default class MapboxUtilities {
  static generateColor () {
    return ('#' + Math.floor(Math.random() * 16777215).toString(16)).padEnd(7, '0')
  }

  static defaultLeafletStyle () {
    return {
      lineColor: '#3388ff',
      lineOpacity: 1.0,
      lineWeight: 3,
      polygonColor: '#3388ff',
      polygonOpacity: 0.2,
      polygonLineColor: '#3388ff',
      polygonLineOpacity: 1.0,
      polygonLineWeight: 3,
      circleColor: '#3388ff',
      circleOpacity: 0.2,
      circleLineColor: '#3388ff',
      circleLineOpacity: 1.0,
      circleLineWeight: 3,
      circleRadiusInPixels: 2.0
    }
  }

  static defaultRandomColorStyle () {
    return {
      lineColor: MapboxUtilities.generateColor(),
      lineOpacity: 1.0,
      lineWeight: 3.0,
      polygonColor: MapboxUtilities.generateColor(),
      polygonOpacity: 0.2,
      polygonLineColor: MapboxUtilities.generateColor(),
      polygonLineOpacity: 1.0,
      polygonLineWeight: 3,
      circleColor: MapboxUtilities.generateColor(),
      circleOpacity: 0.2,
      circleLineColor: MapboxUtilities.generateColor(),
      circleLineOpacity: 1.0,
      circleLineWeight: 3,
      circleRadiusInPixels: 2.0
    }
  }

  static generateMbStyle (style, name) {
    let styleSources = {}
    styleSources[name] = {
      'type': 'vector',
      'maxzoom': 18,
      'tiles': [
        '{z}-{x}-{y}'
      ]
    }
    return {
      'version': 8,
      'name': name,
      'sources': styleSources,
      'layers': [
        {
          'id': 'fill-style',
          'type': 'fill',
          'source': name,
          'source-layer': name,
          'filter': ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
          'paint': {
            'fill-color': [
              'match',
              ['get', 'sub-type'],
              'circle', style.circleColor,
              'polygon', style.polygonColor,
              /* other */ '#3388ff'
            ],
            'fill-opacity': [
              'match',
              ['get', 'sub-type'],
              'circle', style.circleOpacity,
              'polygon', style.polygonOpacity,
              /* other */ 1.0
            ],
            'fill-outline-color': 'rgba(0, 0, 0, 0)'
          }
        },
        {
          'id': 'line-style',
          'type': 'line',
          'source': name,
          'source-layer': name,
          'filter': ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          'paint': {
            'line-width': [
              'match',
              ['get', 'sub-type'],
              'circle', style.circleLineWeight,
              'polygon', style.polygonLineWeight,
              'line', style.lineWeight,
              /* other */ 1.0
            ],
            'line-color': [
              'match',
              ['get', 'sub-type'],
              'circle', style.circleLineColor,
              'polygon', style.polygonLineColor,
              'line', style.lineColor,
              /* other */ '#3388ff'
            ],
            'line-opacity': [
              'match',
              ['get', 'sub-type'],
              'circle', style.circleLineOpacity,
              'polygon', style.polygonLineOpacity,
              'line', style.lineOpacity,
              /* other */ 1.0
            ]
          },
          'layout': {
            'line-join': 'round',
            'line-cap': 'round'
          }
        },
        {
          'id': 'point-style',
          'type': 'circle',
          'source': name,
          'source-layer': name,
          'filter': ['match', ['geometry-type'], ['Point'], true, false],
          'paint': {
            'circle-color': style.circleColor,
            'circle-opacity': style.circleOpacity,
            'circle-stroke-color': style.circleLineColor,
            'circle-stroke-opacity': style.circleLineOpacity,
            'circle-stroke-width': style.circleLineWeight,
            'circle-radius': ['get', 'radius']
          }
        }
      ]
    }
  }
  static getMapboxFeatureCollectionForStyling = (featureSet) => {
    let features = featureSet.slice()
    let multiPointFeatures = features.filter(f => f.geometry.type.toLowerCase() === 'multipoint')
    features = features.filter(f => !(f.geometry.type.toLowerCase() === 'multipoint'))
    multiPointFeatures.forEach(f => {
      f.geometry.coordinates.forEach(c => {
        features.push({
          type: 'Feature',
          id: Math.random().toString(36).substr(2, 9),
          properties: f.properties,
          geometry: {
            type: 'Point',
            coordinates: c
          }
        })
      })
    })

    let multiLineString = features.filter(f => f.geometry.type.toLowerCase() === 'multilinestring')
    features = features.filter(f => !(f.geometry.type.toLowerCase() === 'multilinestring'))
    multiLineString.forEach(f => {
      f.geometry.coordinates.forEach(c => {
        features.push({
          type: 'Feature',
          id: Math.random().toString(36).substr(2, 9),
          properties: f.properties,
          geometry: {
            type: 'LineString',
            coordinates: c
          }
        })
      })
    })

    let multiPolygon = features.filter(f => f.geometry.type.toLowerCase() === 'multipolygon')
    features = features.filter(f => !(f.geometry.type.toLowerCase() === 'multipolygon'))
    multiPolygon.forEach(f => {
      f.geometry.coordinates.forEach(c => {
        features.push({
          type: 'Feature',
          id: Math.random().toString(36).substr(2, 9),
          properties: f.properties,
          geometry: {
            type: 'Polygon',
            coordinates: c
          }
        })
      })
    })

    let circleFeatures = features.filter(f => f.geometry.type.toLowerCase() === 'point')
    features = features.filter(f => !(f.geometry.type.toLowerCase() === 'point'))
    circleFeatures.forEach(f => {
      let radius = f.properties.radius
      if (radius) {
        let circleFeature = circle(f.geometry.coordinates, radius / 1000.0, {steps: 64})
        circleFeature.properties.isCircle = 1
        features.push(circleFeature)
      } else {
        features.push(f)
      }
    })
    features.filter(f => f.geometry.type.toLowerCase() === 'linestring').forEach(l => {
      l.properties['sub-type'] = 'line'
    })
    let polygonFeatures = features.filter(f => f.geometry.type.toLowerCase() === 'polygon')
    polygonFeatures.forEach(f => {
      f.properties['sub-type'] = f.properties.isCircle ? 'circle' : 'polygon'
      const poly = polygon(f.geometry.coordinates)
      const line = polygonToLine(poly)
      if (line.type.toLowerCase() === 'feature') {
        line.id = Math.random().toString(36).substr(2, 9)
        line.properties['sub-type'] = f.properties.isCircle ? 'circle' : 'polygon'
        features.push(line)
      } else if (line.type.toLowerCase() === 'featurecollection') {
        line.features.forEach(feature => {
          feature.id = Math.random().toString(36).substr(2, 9)
          feature.properties['sub-type'] = f.properties.isCircle ? 'circle' : 'polygon'
          features.push(feature)
        })
      }
    })
    return {
      type: 'FeatureCollection',
      features: features
    }
  }
}
