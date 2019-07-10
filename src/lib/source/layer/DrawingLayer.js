import Layer from './Layer'
import VectorTileRenderer from './renderer/VectorTileRenderer'
import TileBoundingBoxUtils from '../../tile/tileBoundingBoxUtils'
import proj4 from 'proj4'
import geojsonvt from 'geojson-vt'
import * as vendor from '../../../lib/vendor'
import * as vtpbf from 'vt-pbf'
import { bboxClip, booleanPointInPolygon, bboxPolygon, polygon, polygonToLine, circle } from '@turf/turf'
import geojsonExtent from '@mapbox/geojson-extent'
import jetpack from 'fs-jetpack'
// import MapcacheMapLayer from '../../map/MapcacheMapLayer'

export default class DrawingLayer extends Layer {
  async initialize () {
    this.features = this._configuration.features
    this.count = this.features.length
    let name = this.name
    let extent = this.extent
    this._vectorTileRenderer = new VectorTileRenderer(this.style, DrawingLayer.generateMbStyle(this.style, this.name), this.name, (x, y, z, map) => {
      return this.getTile({x: x, y: y, z: z}, map, extent, name)
    })
    await this._vectorTileRenderer.init()
    await this.renderOverviewTile()
    return this
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
            'fill-color': style.fillColor,
            'fill-opacity': style.fillOpacity,
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
            'line-width': style.weight,
            'line-color': style.color
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
            'circle-color': style.fillColor,
            'circle-stroke-color': style.color,
            'circle-opacity': style.fillOpacity,
            'circle-stroke-width': style.weight,
            'circle-radius': ['get', 'radius']
          }
        }
      ]
    }
  }

  addFeatureProperties (feature, currentProperties) {
    if (feature.properties.geometry) {
      feature.properties.geometry_property = feature.properties.geometry
      delete feature.properties.geometry
    }

    if (feature.id) {
      if (!currentProperties['_feature_id']) {
        currentProperties['_feature_id'] = currentProperties['_feature_id'] || {
          name: '_feature_id'
        }
      }
    }

    for (var key in feature.properties) {
      if (!currentProperties[key]) {
        currentProperties[key] = currentProperties[key] || {
          name: key
        }

        var type = typeof feature.properties[key]
        if (feature.properties[key] !== undefined && feature.properties[key] !== null && type !== 'undefined') {
          if (type === 'object') {
            if (feature.properties[key] instanceof Date) {
              type = 'Date'
            }
          }
          switch (type) {
            case 'Date':
              type = 'DATETIME'
              break
            case 'number':
              type = 'DOUBLE'
              break
            case 'string':
              type = 'TEXT'
              break
            case 'boolean':
              type = 'BOOLEAN'
              break
          }
          currentProperties[key] = {
            name: key,
            type: type
          }
        }
      }
    }
  }

  getLayerColumns () {
    let properties = {}
    this.features.forEach(feature => {
      this.addFeatureProperties(feature, properties)
    })

    let columns = []
    for (const key in properties) {
      let prop = properties[key]
      if (prop.name.toLowerCase() !== 'id') {
        let c = {
          dataType: prop.type,
          name: prop.name,
          notNull: false,
          defaultValue: null
        }
        columns.push(c)
      }
    }
    return {
      columns: columns,
      geom: {
        name: 'geometry'
      },
      id: {
        name: 'id'
      }
    }
  }

  get configuration () {
    return {
      filePath: this._configuration.name,
      sourceLayerName: this._configuration.name,
      name: this._configuration.name,
      features: this._configuration.features,
      extent: this.extent,
      id: this.id,
      pane: 'vector',
      layerType: 'Drawing',
      count: this._configuration.features.length || 0,
      shown: this.shown || true,
      style: this.style
    }
  }

  get extent () {
    return geojsonExtent({
      type: 'FeatureCollection',
      features: this.getMapboxFeatureSet(this._configuration.features)
    })
  }

  get style () {
    this._style = this._style || {
      radius: 2.0,
      weight: 3,
      color: '#3388ff',
      opacity: 1.0,
      fillColor: '#3388ff',
      fillOpacity: 0.2,
      fillOutlineColor: '#3388ff'
    }
    return this._style
  }

  getTileFeatures (coords, extent) {
    let {x, y, z} = coords
    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
    let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
    let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])
    if (!TileBoundingBoxUtils.tileIntersects(tileUpperRight, tileLowerLeft, [extent[2], extent[3]], [extent[0], extent[1]])) {
      return []
    }

    let features = []
    let featureMap = this.iterateFeaturesInBounds([
      [tileLowerLeft[1], tileLowerLeft[0]],
      [tileUpperRight[1], tileUpperRight[0]]
    ], true)

    for (let i = 0; i < featureMap.length; i++) {
      let feature = featureMap[i]
      if (feature) {
        features.push(feature)
      }
    }
    return features
  }

  getTile (coords, map, extent, name) {
    return new Promise((resolve, reject) => {
      let {x, y, z} = coords

      let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
      let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
      let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])

      if (!TileBoundingBoxUtils.tileIntersects(tileUpperRight, tileLowerLeft, [extent[2], extent[3]], [extent[0], extent[1]])) {
        return resolve(this.emptyVectorTile(name))
      }

      let featureCollection = {
        type: 'FeatureCollection',
        features: JSON.parse(JSON.stringify(this.getTileFeatures(coords, extent)))
      }

      let tileBuffer = 8
      let tileIndex = geojsonvt(featureCollection, {buffer: tileBuffer * 8, maxZoom: z})
      let tile = tileIndex.getTile(z, x, y)

      let gjvt = {}
      if (tile) {
        gjvt[name] = tile
      } else {
        gjvt[name] = {features: []}
      }

      let vectorTilePBF = vtpbf.fromGeojsonVt(gjvt)
      resolve(vectorTilePBF)
    })
  }

  getMapboxFeatureSet (leafletFeatureSet) {
    let features = leafletFeatureSet.slice()
    let circleFeatures = features.filter(f => f.geometry.type.toLowerCase() === 'point' && f.properties.radius !== undefined)
    features = features.filter(f => !(f.geometry.type.toLowerCase() === 'point' && f.properties.radius !== undefined))
    circleFeatures.forEach(f => {
      let circleFeature = circle(f.geometry.coordinates, f.properties.radius / 1000.0, {steps: 64})
      features.push(circleFeature)
    })
    let polygonFeatures = features.filter(f => f.geometry.type.toLowerCase() === 'polygon')
    polygonFeatures.forEach(f => {
      const poly = polygon(f.geometry.coordinates)
      const line = polygonToLine(poly)
      if (line.type.toLowerCase() === 'feature') {
        line.id = Math.random().toString(36).substr(2, 9)
        features.push(line)
      } else if (line.type.toLowerCase() === 'featurecollection') {
        line.features.forEach(feature => {
          feature.id = Math.random().toString(36).substr(2, 9)
          features.push(feature)
        })
      }
    })
    return features
  }

  iterateFeaturesInBounds (bounds) {
    const bbox = [bounds[0][1], bounds[0][0], bounds[1][1], bounds[1][0]]
    return this.getMapboxFeatureSet(this._configuration.features).map((feature) => {
      try {
        if (feature.geometry.type.toLowerCase() === 'point') {
          const bboxPoly = bboxPolygon(bbox)
          if (booleanPointInPolygon(feature.geometry.coordinates, bboxPoly)) {
            return feature
          }
        } else if (feature.geometry.type.toLowerCase() === 'multipoint') {
          const bboxPoly = bboxPolygon(bbox)
          let coordinatesWithin = []
          feature.geometry.coordinates.forEach((coordinate) => {
            if (booleanPointInPolygon(coordinate, bboxPoly)) {
              coordinatesWithin.push(coordinate)
            }
          })
          return {
            type: 'Feature',
            id: Math.random().toString(36).substr(2, 9),
            properties: feature.properties,
            geometry: {
              type: 'MultiPoint',
              coordinates: coordinatesWithin
            }
          }
        } else if (feature.geometry.type.toLowerCase() === 'linestring' || feature.geometry.type.toLowerCase() === 'multilinestring') {
          return feature
        } else {
          let clipped = bboxClip(feature, bbox)
          if (clipped && clipped.geometry.coordinates.length > 0) {
            return {
              type: 'Feature',
              id: Math.random().toString(36).substr(2, 9),
              properties: feature.properties,
              geometry: clipped.geometry
            }
          }
        }
      } catch (e) {
        console.log(e)
      }
    })
  }

  async renderTile (coords, tileCanvas, done) {
    return this._vectorTileRenderer.renderVectorTile(coords, tileCanvas, done)
  }

  emptyVectorTile (name) {
    const gjvt = {}
    gjvt[name] = {features: []}
    return vtpbf.fromGeojsonVt(gjvt)
  }

  renderOverviewTile (coords) {
    let overviewTilePath = this.overviewTilePath
    if (jetpack.exists(this.overviewTilePath)) return
    this.renderTile({x: 0, y: 0, z: 0}, null, function (err, imageData) {
      if (err) throw err
      jetpack.write(overviewTilePath, imageData)
    })
  }

  get mapLayer () {
    let style = this.style
    if (style.radius) {
      delete style.radius
    }

    if (!this._mapLayer) {
      this._mapLayer = new vendor.L.LayerGroup()
      this._mapLayer.id = this.id
    }
    this._mapLayer.remove()
    this._configuration.features.forEach(feature => {
      if (feature.properties.radius) {
        let styleCopy = Object.assign({}, style)
        styleCopy.radius = feature.properties.radius
        let layer = new vendor.L.Circle([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], styleCopy)
        layer.id = feature.id
        this._mapLayer.addLayer(layer)
      } else {
        let layer = new vendor.L.GeoJSON(feature, { style })
        layer.id = feature.id
        this._mapLayer.addLayer(layer)
      }
    })
    return this._mapLayer
  }

  // get mapLayer () {
  //   if (this._mapLayer) return this._mapLayer
  //
  //   this._mapLayer = new MapcacheMapLayer({
  //     layer: this,
  //     pane: 'overlayPane'
  //   })
  //
  //   this._mapLayer.id = this.id
  //   return this._mapLayer
  // }
}
