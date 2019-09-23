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
      pointColor: '#3388ff',
      pointOpacity: 1.0,
      pointRadiusInPixels: 2.0,
      pointIcon: {
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Ts+HEa73u6dT3FNWwflY86eMHPk+Yu+i6pzUpRrW7SNDg5JHR4KapmM5Wv2E8Tfcb1HoqqHMHU+uWDD7zg54mz5/2BSnizi9T1Dg4QQXLToGNCkb6tb1NU+QAlGr1++eADrzhn/u8Q2YZhQVlZ5+CAOtqfbhmaUCS1ezNFVm2imDbPmPng5wmz+gwh+oHDce0eUtQ6OGDIyR0uUhUsoO3vfDmmgOezH0mZN59x7MBi++WDL1g/eEiU3avlidO671bkLfwbw5XV2P8Pzo0ydy4t2/0eu33xYSOMOD8hTf4CrBtGMSoXfPLchX+J0ruSePw3LZeK0juPJbYzrhkH0io7B3k164hiGvawhOKMLkrQLyVpZg8rHFW7E2uHOL888IBPlNZ1FPzstSJM694fWr6RwpvcJK60+0HCILTBzZLFNdtAzJaohze60T8qBzyh5ZuOg5e7uwQppofEmf2++DYvmySqGBuKaicF1blQjhuHdvCIMvp8whTTfZzI7RldpwtSzL+F1+wkdZ2TBOW2gIF88PBTzD/gpeREAMEbxnJcaJHNHrpzji0gQCS6hdkEeYt9DF/2qPcEC8RM28Hwmr3sdNyht00byAut2k3gufWNtgtOEOFGUwcXWNDbdNbpgBGxEvKkOQsxivJx33iow0Vw5S6SVTrpVq11ysA2Rp7gTfPfktc6zhtXBBC+adRLshf6sG2RfHPZ5EAc4sVZ83yCN00Fk/4kggu40ZTvIEm5g24qtU4KjBrx/BTTH8ifVASAG7gKrnWxJDcU7x8X6Ecczhm3o6YicvsLXWfh3Ch1W0k8x0nXF+0fFxgt4phz8QvypiwCCFKMqXCnqXExjq10beH+UUA7+nG6mdG/Pu0f3LgFcGrl2s0kNNjpmoJ9o4B29CMO8dMT4Q5ox8uitF6fqsrJOr8qnwNbRzv6hSnG5wP+64C7h9lp30hKNtKdWjtdkbuPA19nJ7Tz3zR/ibgARbhb4AlhavcBebmTHcFl2fvYEnW0ox9xMxKBS8btJ+KiEbq9zA4RthQXDhPa0T9TEe69gWupwc6uBUphquXgf+/FrIjweHQS4/pduMe5ERUMHUd9xv8ZR98CxkS4F2n3EUrUZ10EYNw7BWm9x1GiPssi3GgiGRDKWRYZfXlON+dfNbM+GgIwYdwAAAAASUVORK5CYII=',
        width: 25,
        height: 41,
        anchor_x: 12.5,
        anchor_y: 41
      },
      pointIconOrStyle: 'icon'
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
      pointColor: MapboxUtilities.generateColor(),
      pointOpacity: 1.0,
      pointRadiusInPixels: 2.0,
      pointIcon: {
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Ts+HEa73u6dT3FNWwflY86eMHPk+Yu+i6pzUpRrW7SNDg5JHR4KapmM5Wv2E8Tfcb1HoqqHMHU+uWDD7zg54mz5/2BSnizi9T1Dg4QQXLToGNCkb6tb1NU+QAlGr1++eADrzhn/u8Q2YZhQVlZ5+CAOtqfbhmaUCS1ezNFVm2imDbPmPng5wmz+gwh+oHDce0eUtQ6OGDIyR0uUhUsoO3vfDmmgOezH0mZN59x7MBi++WDL1g/eEiU3avlidO671bkLfwbw5XV2P8Pzo0ydy4t2/0eu33xYSOMOD8hTf4CrBtGMSoXfPLchX+J0ruSePw3LZeK0juPJbYzrhkH0io7B3k164hiGvawhOKMLkrQLyVpZg8rHFW7E2uHOL888IBPlNZ1FPzstSJM694fWr6RwpvcJK60+0HCILTBzZLFNdtAzJaohze60T8qBzyh5ZuOg5e7uwQppofEmf2++DYvmySqGBuKaicF1blQjhuHdvCIMvp8whTTfZzI7RldpwtSzL+F1+wkdZ2TBOW2gIF88PBTzD/gpeREAMEbxnJcaJHNHrpzji0gQCS6hdkEeYt9DF/2qPcEC8RM28Hwmr3sdNyht00byAut2k3gufWNtgtOEOFGUwcXWNDbdNbpgBGxEvKkOQsxivJx33iow0Vw5S6SVTrpVq11ysA2Rp7gTfPfktc6zhtXBBC+adRLshf6sG2RfHPZ5EAc4sVZ83yCN00Fk/4kggu40ZTvIEm5g24qtU4KjBrx/BTTH8ifVASAG7gKrnWxJDcU7x8X6Ecczhm3o6YicvsLXWfh3Ch1W0k8x0nXF+0fFxgt4phz8QvypiwCCFKMqXCnqXExjq10beH+UUA7+nG6mdG/Pu0f3LgFcGrl2s0kNNjpmoJ9o4B29CMO8dMT4Q5ox8uitF6fqsrJOr8qnwNbRzv6hSnG5wP+64C7h9lp30hKNtKdWjtdkbuPA19nJ7Tz3zR/ibgARbhb4AlhavcBebmTHcFl2fvYEnW0ox9xMxKBS8btJ+KiEbq9zA4RthQXDhPa0T9TEe69gWupwc6uBUphquXgf+/FrIjweHQS4/pduMe5ERUMHUd9xv8ZR98CxkS4F2n3EUrUZ10EYNw7BWm9x1GiPssi3GgiGRDKWRYZfXlON+dfNbM+GgIwYdwAAAAASUVORK5CYII=',
        width: 25,
        height: 41,
        anchor_x: 12.5,
        anchor_y: 41
      },
      pointIconOrStyle: 'icon'
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

  static generateTileIndex (name, features) {
    let tileIndices = {}
    tileIndices[name] = geojsonvt({
      type: 'FeatureCollection',
      features: features
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
          'source': 'fill-style-circle',
          'source-layer': 'fill-style-circle',
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
          properties: Object.assign({}, f.properties),
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
          properties: Object.assign({}, f.properties),
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
          properties: Object.assign({}, f.properties),
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
        line.properties = Object.assign({}, f.properties)
        line.properties['sub-type'] = f.properties.isCircle ? 1 : 2
        features.push(line)
      } else if (line.type.toLowerCase() === 'featurecollection') {
        line.features.forEach(feature => {
          feature.id = Math.random().toString(36).substr(2, 9)
          feature.properties = Object.assign({}, f.properties)
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
