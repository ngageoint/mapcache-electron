import Layer from '../Layer'
import MapcacheMapLayer from '../../../map/MapcacheMapLayer'
import * as vtpbf from 'vt-pbf'
import GeoPackageVectorTileRenderer from '../renderer/GeoPackageVectorTileRenderer'
import jetpack from 'fs-jetpack'
import {bboxClip, booleanPointInPolygon, bboxPolygon, circle} from '@turf/turf/index'
import GeoPackage, {BoundingBox} from '@ngageoint/geopackage'

/**
 * VectorLayer is a 'Layer' within MapCache that is displayed on a map.
 * The VectorLayer uses the GeoPackage FeatureTiles API as an XYZ Tile Service to display
 * styled vector data from the GeoPackage on the map. The GeoPackage should be setup to contain
 * the feature collection of the data source as well as any user/source defined styling.
 */
export default class VectorLayer extends Layer {
  _extent
  _mapLayer
  _vectorTileRenderer
  _tileIndex
  _geopackageFilePath
  _geopackage
  _features
  _layerKey
  _maxFeatures
  _featureDao
  _tablePointIconRowId

  constructor (configuration = {}) {
    super(configuration)
    this._extent = configuration.extent
    this._geopackageFilePath = configuration.geopackageFilePath
    this._layerKey = configuration.layerKey || 0
    this._maxFeatures = configuration.maxFeatures || 250
    this._tablePointIconRowId = configuration.tablePointIconRowId || -1
  }

  async initialize () {
    this._geopackage = await GeoPackage.open(this._geopackageFilePath)
    this._featureDao = this._geopackage.getFeatureDao(this.sourceLayerName)
    this._features = (await GeoPackage.getGeoJSONFeaturesInTile(this._geopackage, this.sourceLayerName, 0, 0, 0, true)).map(f => {
      f.type = 'Feature'
      return f
    })
    await this.vectorTileRenderer.init()
    await this.renderOverviewTile()
    return this
  }

  async updateStyle (maxFeatures) {
    this._geopackage = await GeoPackage.open(this._geopackageFilePath)
    this._maxFeatures = maxFeatures
    await this.vectorTileRenderer.styleChanged(this._geopackage, maxFeatures)
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        pane: 'vector',
        layerType: 'Vector',
        extent: this.extent,
        count: this.count || 0,
        geopackageFilePath: this._geopackageFilePath,
        layerKey: this._layerKey,
        maxFeatures: this._maxFeatures,
        tablePointIconRowId: this._tablePointIconRowId
      }
    }
  }

  get featureCollection () {
    return {
      type: 'FeatureCollection',
      features: this._features
    }
  }

  get count () {
    return this._featureDao.getCount()
  }

  get extent () {
    if (!this._extent) {
      let contentsDao = this._geopackage.getContentsDao()
      let contents = contentsDao.queryForId(this.sourceLayerName)
      let proj = contentsDao.getProjection(contents)
      let boundingBox = new GeoPackage.BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y).projectBoundingBox(proj, 'EPSG:4326')
      this._extent = [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
    }
    return this._extent
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
      this._vectorTileRenderer = new GeoPackageVectorTileRenderer(this._geopackage, this.name, this._maxFeatures)
    }
    return this._vectorTileRenderer
  }

  async renderTile (coords, tileCanvas, done) {
    return this.vectorTileRenderer.renderVectorTile(coords, tileCanvas, done)
  }

  getTile (coords) {
    return new Promise((resolve) => {
      let gjvt = {}
      Object.keys(this._tileIndex).forEach(key => {
        let tile = this._tileIndex[key].getTile(coords.z, coords.x, coords.y)
        if (tile) {
          gjvt[key] = tile
        } else {
          gjvt[key] = {features: []}
        }
      })
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
    if (this._featureDao.isIndexed()) {
      let bb = new BoundingBox(bounds[0][1], bounds[1][1], bounds[0][0], bounds[1][0])
      let features = []
      try {
        let iterator = this._featureDao.queryForGeoJSONIndexedFeaturesWithBoundingBox(bb, true)
        for (const feature of iterator) {
          features.push(feature)
        }
      } catch (error) {
        console.log(error)
      }
      return features
    } else {
      const bbox = [bounds[0][1], bounds[0][0], bounds[1][1], bounds[1][0]]
      return this.featureCollection.features.map((feature) => {
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
      }).filter(feature => feature !== undefined)
    }
  }
}
