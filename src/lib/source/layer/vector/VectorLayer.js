import Layer from '../Layer'
import MapcacheMapLayer from '../../../map/MapcacheMapLayer'
import * as vtpbf from 'vt-pbf'
import geojsonvt from 'geojson-vt'
import VectorTileRenderer from '../renderer/VectorTileRenderer'
import geojsonExtent from '@mapbox/geojson-extent'
import jetpack from 'fs-jetpack'
import MapboxUtilities from '../../../MapboxUtilities'
import {bboxClip, booleanPointInPolygon, bboxPolygon, circle} from '@turf/turf/index'

export default class VectorLayer extends Layer {
  _mapLayer
  _vectorTileRenderer
  _tileIndex

  async initialize () {
    if (!this.style) {
      this.style = MapboxUtilities.defaultRandomColorStyle()
    }
    if (this.editableStyle || !this.mbStyle) {
      this.mbStyle = MapboxUtilities.generateMbStyle(this.style, this.name)
    }
    await this.tileIndex
    await this.vectorTileRenderer.init()
    await this.renderOverviewTile()
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        pane: 'vector',
        extent: this.extent,
        count: this.count || 0
      }
    }
  }

  get featureCollection () {
    throw new Error('Abstract method to be implemented in sublcass')
  }

  get count () {
    return this.featureCollection.features.length
  }

  get extent () {
    let featureCollection = this.editableStyle ? MapboxUtilities.getMapboxFeatureCollectionForStyling(this.featureCollection.features) : this.featureCollection
    return geojsonExtent(featureCollection)
  }

  get mapLayer () {
    if (!this._mapLayer) {
      this._mapLayer = new MapcacheMapLayer({
        layer: this,
        pane: 'overlayPane'
      })
      this._mapLayer.id = this.id
    }
    return this._mapLayer
  }

  get vectorTileRenderer () {
    if (!this._vectorTileRenderer) {
      this._vectorTileRenderer = new VectorTileRenderer(this.mbStyle, (x, y, z, map) => {
        return this.getTile({x: x, y: y, z: z}, map, this.extent, this.name)
      })
    }
    return this._vectorTileRenderer
  }

  get tileIndex () {
    if (!this._tileIndex) {
      this._tileIndex = geojsonvt(this.editableStyle ? MapboxUtilities.getMapboxFeatureCollectionForStyling(this.featureCollection.features) : this.featureCollection, {buffer: 64, maxZoom: 18})
    }
    return this._tileIndex
  }

  async renderTile (coords, tileCanvas, done) {
    return this.vectorTileRenderer.renderVectorTile(coords, tileCanvas, done)
  }

  getTile (coords, map, extent, name) {
    return new Promise((resolve) => {
      let tile = this.tileIndex.getTile(coords.z, coords.x, coords.y)
      let gjvt = {}
      if (tile) {
        gjvt[name] = tile
      } else {
        gjvt[name] = {features: []}
      }
      resolve(vtpbf.fromGeojsonVt(gjvt))
    })
  }

  renderOverviewTile () {
    let overviewTilePath = this.overviewTilePath
    if (jetpack.exists(this.overviewTilePath)) return
    this.renderTile({x: 0, y: 0, z: 0}, null, function (err, imageData) {
      if (err) throw err
      jetpack.write(overviewTilePath, imageData)
    })
  }

  getLayerColumns () {
    let properties = {}
    this.featureCollection.features.forEach(feature => {
      VectorLayer.addFeatureProperties(feature, properties)
    })
    let columns = []
    Object.keys(properties).forEach(key => {
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
    })
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

  static addFeatureProperties (feature, currentProperties) {
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

    Object.keys(feature.properties).forEach(key => {
      if (!currentProperties[key]) {
        currentProperties[key] = currentProperties[key] || {
          name: key
        }
        let type = typeof feature.properties[key]
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
}
