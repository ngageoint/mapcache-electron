import Layer from './Layer'
import jetpack from 'fs-jetpack'
import VectorTileRenderer from './renderer/VectorTileRenderer'
import TileBoundingBoxUtils from '../../tile/tileBoundingBoxUtils'
import proj4 from 'proj4'
import geojsonvt from 'geojson-vt'
import * as vtpbf from 'vt-pbf'
import request from 'request-promise-native'
import MapcacheMapLayer from '../../map/MapcacheMapLayer'
import { bboxClip, booleanPointInPolygon, bboxPolygon } from '@turf/turf'

export default class WFSLayer extends Layer {
  _vectorTileRenderer

  async initialize () {
    this.features = await this.getFeaturesInLayer(this._configuration.sourceLayerName)
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

  getFeaturesInLayer (layer) {
    return new Promise((resolve) => {
      let options = {
        method: 'GET',
        url: this.filePath + '&request=GetFeature&typeNames=' + layer + '&outputFormat=application/json&srsName=crs:84',
        encoding: null,
        gzip: true
      }
      if (this.credentials) {
        if (this.credentials.type === 'basic') {
          if (!options.headers) {
            options.headers = {}
          }
          options.headers['Authorization'] = this.credentials.authorization
        }
      }
      request(options, (error, response, body) => {
        if (!error) {
          let featureCollection = JSON.parse(body)
          if (featureCollection && featureCollection.features) {
            let features = []
            featureCollection.features.forEach((feature) => {
              let splitType = ''
              if (feature.geometry.type === 'MultiPolygon') {
                splitType = 'Polygon'
              } else if (feature.geometry.type === 'MultiLineString') {
                splitType = 'LineString'
              } else {
                features.push(feature)
                return
              }
              feature.geometry.coordinates.forEach((coords) => {
                features.push({
                  type: 'Feature',
                  properties: feature.properties,
                  geometry: {
                    type: splitType,
                    coordinates: coords
                  }
                })
              })
            })
            resolve(features)
          } else {
            resolve([])
          }
        }
      })
    })
  }

  get configuration () {
    return {
      filePath: this.filePath,
      sourceLayerName: this.sourceLayerName,
      name: this.name,
      extent: this.extent,
      id: this.id,
      pane: 'vector',
      layerType: 'WFS',
      overviewTilePath: this.overviewTilePath,
      count: this.count || 0,
      shown: this.shown || true,
      style: this.style,
      credentials: this.credentials
    }
  }

  get extent () {
    if (this._configuration.extent) {
      return this._configuration.extent
    }
    this._configuration.extent = [-180, -90, 180, 90]
    return this._configuration.extent
  }

  generateColor () {
    let color = '#' + Math.floor(Math.random() * 16777215).toString(16)
    return color.padEnd(7, '0')
  }

  get style () {
    this._style = this._style || {
      weight: 2.0,
      radius: 2.0,
      color: this.generateColor(),
      opacity: 1.0,
      fillColor: this.generateColor(),
      fillOpacity: 1.0,
      fillOutlineColor: this.generateColor()
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
        features: this.getTileFeatures(coords, extent)
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

  iterateFeaturesInBounds (bounds) {
    const bbox = [bounds[0][1], bounds[0][0], bounds[1][1], bounds[1][0]]

    return this.features.map((feature) => {
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
        } else {
          let clipped = bboxClip(feature, bbox)
          if (clipped) {
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

  renderOverviewTile (coords) {
    let overviewTilePath = this.overviewTilePath
    if (jetpack.exists(this.overviewTilePath)) return
    this.renderTile({x: 0, y: 0, z: 0}, null, function (err, imageData) {
      if (err) throw err
      jetpack.write(overviewTilePath, imageData)
    })
  }

  emptyVectorTile (name) {
    const gjvt = {}
    gjvt[name] = {features: []}
    return vtpbf.fromGeojsonVt(gjvt)
  }

  get mapLayer () {
    if (this._mapLayer) return this._mapLayer

    this._mapLayer = new MapcacheMapLayer({
      layer: this,
      pane: this.pane === 'tile' ? 'tilePane' : 'overlayPane'
    })

    this._mapLayer.id = this.id
    return this._mapLayer
  }
}
