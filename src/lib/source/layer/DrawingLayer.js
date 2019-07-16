import Layer from './Layer'
import VectorTileRenderer from './renderer/VectorTileRenderer'
import TileBoundingBoxUtils from '../../tile/tileBoundingBoxUtils'
import proj4 from 'proj4'
import geojsonvt from 'geojson-vt'
import * as vendor from '../../../lib/vendor'
import * as vtpbf from 'vt-pbf'
import {bboxClip, booleanPointInPolygon, bboxPolygon, circle} from '@turf/turf'
import geojsonExtent from '@mapbox/geojson-extent'
import jetpack from 'fs-jetpack'
import MapboxUtilities from '../../MapboxUtilities'
// import MapcacheMapLayer from '../../map/MapcacheMapLayer'

export default class DrawingLayer extends Layer {
  async initialize () {
    this.features = this._configuration.features
    this.count = this.features.length
    let name = this.name
    let extent = this.extent
    this._vectorTileRenderer = new VectorTileRenderer(this.style, this.mbStyle, this.name, (x, y, z, map) => {
      return this.getTile({x: x, y: y, z: z}, map, extent, name)
    })
    await this._vectorTileRenderer.init()
    await this.renderOverviewTile()
    return this
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
      features: MapboxUtilities.getMapboxFeatureCollectionForStyling(this._configuration.features)
    })
  }

  get style () {
    this._style = this._style || MapboxUtilities.defaultLeafletStyle()
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
    return MapboxUtilities.getMapboxFeatureCollectionForStyling(features)
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

      console.log(featureCollection)

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

  iterateFeaturesInBounds (bounds) {
    const bbox = [bounds[0][1], bounds[0][0], bounds[1][1], bounds[1][0]]
    return this._configuration.features.map((feature) => {
      try {
        if (feature.geometry.type.toLowerCase() === 'point') {
          const bboxPoly = bboxPolygon(bbox)
          // this point is a circle, let's check to see if it will exist in the bounding box
          if (feature.properties.radius) {
            let circleFeature = circle(feature.geometry.coordinates, feature.properties.radius / 1000.0, {steps: 64})
            let clipped = bboxClip(circleFeature, bbox)
            if (clipped && clipped.geometry.coordinates.length > 0) {
              return feature
            }
          } else if (booleanPointInPolygon(feature.geometry.coordinates, bboxPoly)) {
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
            return feature
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
    let mapboxStyleValues = this.style
    if (!this._mapLayer) {
      this._mapLayer = new vendor.L.LayerGroup()
      this._mapLayer.id = this.id
    }
    this._mapLayer.remove()
    this._configuration.features.forEach(feature => {
      if (feature.properties.radius) {
        let style = {
          radius: feature.properties.radius,
          fillColor: mapboxStyleValues.circleColor,
          fillOpacity: mapboxStyleValues.circleOpacity,
          color: mapboxStyleValues.circleLineColor,
          opacity: mapboxStyleValues.circleLineOpacity,
          weight: mapboxStyleValues.circleLineWeight
        }
        let layer = new vendor.L.Circle([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], style)
        layer.id = feature.id
        this._mapLayer.addLayer(layer)
      } else if (feature.geometry.type.toLowerCase() === 'polygon' || feature.geometry.type.toLowerCase() === 'multipolygon') {
        let style = {
          radius: feature.properties.radius,
          fillColor: mapboxStyleValues.polygonColor,
          fillOpacity: mapboxStyleValues.polygonOpacity,
          color: mapboxStyleValues.polygonLineColor,
          opacity: mapboxStyleValues.polygonLineOpacity,
          weight: mapboxStyleValues.polygonLineWeight
        }
        let layer = new vendor.L.GeoJSON(feature, { style: style })
        layer.id = feature.id
        this._mapLayer.addLayer(layer)
      } else {
        let style = {
          color: mapboxStyleValues.lineColor,
          opacity: mapboxStyleValues.lineOpacity,
          weight: mapboxStyleValues.lineWeight
        }
        let layer = new vendor.L.GeoJSON(feature, { style: style })
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
