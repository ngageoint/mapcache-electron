import Layer from '../Layer'
import * as vtpbf from 'vt-pbf'
import GeoPackageVectorTileRenderer from '../renderer/GeoPackageVectorTileRenderer'
import GeoPackage from '@ngageoint/geopackage'

/**
 * VectorLayer is a 'Layer' within MapCache that is displayed on a map.
 * The VectorLayer uses the GeoPackage FeatureTiles API as an XYZ Tile Service to display
 * styled vector data from the GeoPackage on the map. The GeoPackage should be setup to contain
 * the feature collection of the data source as well as any user/source defined styling.
 */
export default class VectorLayer extends Layer {
  _extent
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
}
