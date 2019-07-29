import {circle, polygonToLine, polygon} from '@turf/turf'
import geojsonvt from 'geojson-vt'

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

  static generateTileIndexForMbStyling (features) {
    let tileIndices = {}
    tileIndices['fill-style-polygon'] = geojsonvt({
      type: 'FeatureCollection',
      features: features.filter(f => f.geometry.type === 'Polygon' && f.properties['sub-type'] === 2)
    }, {buffer: 64, maxZoom: 18})
    tileIndices['fill-style-circle'] = geojsonvt({
      type: 'FeatureCollection',
      features: features.filter(f => f.geometry.type === 'Polygon' && f.properties['sub-type'] === 1)
    }, {buffer: 64, maxZoom: 18})
    tileIndices['line-style-line'] = geojsonvt({
      type: 'FeatureCollection',
      features: features.filter(f => f.geometry.type === 'LineString' && f.properties['sub-type'] === 0)
    }, {buffer: 64, maxZoom: 18})
    tileIndices['line-style-polygon'] = geojsonvt({
      type: 'FeatureCollection',
      features: features.filter(f => f.geometry.type === 'LineString' && f.properties['sub-type'] === 2)
    }, {buffer: 64, maxZoom: 18})
    tileIndices['line-style-circle'] = geojsonvt({
      type: 'FeatureCollection',
      features: features.filter(f => f.geometry.type === 'LineString' && f.properties['sub-type'] === 1)
    }, {buffer: 64, maxZoom: 18})
    tileIndices['point-style'] = geojsonvt({
      type: 'FeatureCollection',
      features: features.filter(f => f.geometry.type === 'Point')
    }, {buffer: 64, maxZoom: 18})
    return tileIndices
  }

  static generateMbStyle (style, name) {
    let styleSources = {}
    let source = {
      'type': 'vector',
      'maxzoom': 18,
      'tiles': [
        '{z}-{x}-{y}'
      ]
    }
    let types = ['fill-style-polygon', 'fill-style-circle', 'line-style-line', 'line-style-polygon', 'line-style-circle', 'point-style']
    types.forEach(type => {
      styleSources[type] = source
    })
    return {
      'version': 8,
      'name': name,
      'sources': styleSources,
      'layers': [
        {
          'id': 'fill-style-polygon',
          'type': 'fill',
          'source': 'fill-style-polygon',
          'source-layer': 'fill-style-polygon',
          'paint': {
            'fill-color': style.polygonColor,
            'fill-opacity': style.polygonOpacity,
            'fill-outline-color': 'rgba(0, 0, 0, 0)'
          }
        },
        {
          'id': 'fill-style-circle',
          'type': 'fill',
          'source': name + '-polygon',
          'source-layer': name + '-polygon',
          'paint': {
            'fill-color': style.circleColor,
            'fill-opacity': style.circleOpacity,
            'fill-outline-color': 'rgba(0, 0, 0, 0)'
          }
        },
        {
          'id': 'line-style-line',
          'type': 'line',
          'source': 'line-style-line',
          'source-layer': 'line-style-line',
          'paint': {
            'line-width': style.lineWeight,
            'line-color': style.lineColor,
            'line-opacity': style.lineOpacity
          },
          'layout': {
            'line-join': 'round',
            'line-cap': 'round'
          }
        },
        {
          'id': 'line-style-circle',
          'type': 'line',
          'source': 'line-style-circle',
          'source-layer': 'line-style-circle',
          'paint': {
            'line-width': style.circleLineWeight,
            'line-color': style.circleLineColor,
            'line-opacity': style.circleLineOpacity
          },
          'layout': {
            'line-join': 'round',
            'line-cap': 'round'
          }
        },
        {
          'id': 'line-style-polygon',
          'type': 'line',
          'source': 'line-style-polygon',
          'source-layer': 'line-style-polygon',
          'paint': {
            'line-width': style.polygonLineWeight,
            'line-color': style.polygonLineColor,
            'line-opacity': style.polygonLineOpacity
          },
          'layout': {
            'line-join': 'round',
            'line-cap': 'round'
          }
        },
        {
          'id': 'point-style',
          'type': 'circle',
          'source': 'point-style',
          'source-layer': 'point-style',
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
    let multiPointFeatures = features.filter(f => f.geometry.type === 'MultiPoint')
    features = features.filter(f => !(f.geometry.type === 'MultiPoint'))
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

    let multiLineString = features.filter(f => f.geometry.type === 'MultiLineString')
    features = features.filter(f => !(f.geometry.type === 'MultiLineString'))
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

    let multiPolygon = features.filter(f => f.geometry.type === 'MultiPolygon')
    features = features.filter(f => !(f.geometry.type === 'MultiPolygon'))
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

    let circleFeatures = features.filter(f => f.geometry.type === 'Point')
    features = features.filter(f => !(f.geometry.type === 'Point'))
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
    features.filter(f => f.geometry.type === 'LineString').forEach(l => {
      l.properties['sub-type'] = 0 // line
    })
    let polygonFeatures = features.filter(f => f.geometry.type === 'Polygon')
    polygonFeatures.forEach(f => {
      f.properties['sub-type'] = f.properties.isCircle ? 1 : 2
      const poly = polygon(f.geometry.coordinates)
      const line = polygonToLine(poly)
      if (line.type.toLowerCase() === 'feature') {
        line.id = Math.random().toString(36).substr(2, 9)
        line.properties['sub-type'] = f.properties.isCircle ? 1 : 2
        features.push(line)
      } else if (line.type.toLowerCase() === 'featurecollection') {
        line.features.forEach(feature => {
          feature.id = Math.random().toString(36).substr(2, 9)
          feature.properties['sub-type'] = f.properties.isCircle ? 1 : 2
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
