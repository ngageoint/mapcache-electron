import Layer from '../Layer'
import * as vtpbf from 'vt-pbf'
import GeoPackageVectorTileRenderer from '../renderer/GeoPackageVectorTileRenderer'
import GeoPackageUtilities from '../../../GeoPackageUtilities'

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
  _features
  _layerKey
  _maxFeatures

  constructor (configuration = {}) {
    super(configuration)
    this._extent = configuration.extent
    this._geopackageFilePath = configuration.geopackageFilePath
    this._layerKey = configuration.layerKey || 0
    this._maxFeatures = configuration.maxFeatures || 250
  }

  async initialize () {
    this._features = await GeoPackageUtilities.getAllFeaturesAsGeoJSON(this._geopackageFilePath, this.sourceLayerName)
    await this.vectorTileRenderer.init()
    return this
  }

  close () {
    if (this._vectorTileRenderer) {
      this._vectorTileRenderer.close()
    }
  }

  async updateStyle (maxFeatures) {
    this._maxFeatures = maxFeatures
    return this.vectorTileRenderer.styleChanged(maxFeatures)
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
        maxFeatures: this._maxFeatures
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
    return this._features.length
  }

  get extent () {
    if (!this._extent) {
      this._extent = GeoPackageUtilities.getBoundingBoxForTable(this._geopackageFilePath, this.sourceLayerName)
    }
    return this._extent
  }

  get vectorTileRenderer () {
    if (!this._vectorTileRenderer) {
      this._vectorTileRenderer = new GeoPackageVectorTileRenderer(this._geopackageFilePath, this.name, this._maxFeatures)
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
