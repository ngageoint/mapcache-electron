import Layer from '../Layer'
import GeoPackageVectorTileRenderer from '../renderer/GeoPackageVectorTileRenderer'
import GeoPackageUtilities from '../../../GeoPackageUtilities'
import LayerTypes from '../LayerTypes'

/**
 * VectorLayer is a 'Layer' within MapCache that is displayed on a map.
 * The VectorLayer uses the GeoPackage FeatureTiles API as an XYZ Tile Service to display
 * styled vector data from the GeoPackage on the map. The GeoPackage should be setup to contain
 * the feature collection of the data source as well as any user/source defined styling.
 */
export default class VectorLayer extends Layer {
  _extent
  _vectorTileRenderer
  _geopackageFilePath
  _features
  _layerKey
  _maxFeatures

  constructor (configuration = {}) {
    super(configuration)
    this._geopackageFilePath = configuration.geopackageFilePath
    this._layerKey = configuration.layerKey || 0
    this._maxFeatures = configuration.maxFeatures || 250
    this._styleAssignment = {table: null, featureId: -1}
    this._iconAssignment = {table: null, featureId: -1}
    this._tableStyleAssignment = {table: null, geometryType: -1}
    this._tableIconAssignment = {table: null, geometryType: -1}
  }

  async initialize () {
    this._features = await GeoPackageUtilities.getAllFeaturesAsGeoJSON(this._geopackageFilePath, this.sourceLayerName)
    this._extent = await GeoPackageUtilities.getBoundingBoxForTable(this._geopackageFilePath, this.sourceLayerName)
    await this.vectorTileRenderer.init()
    await super.initialize()
    return this
  }

  close () {
    if (this._vectorTileRenderer) {
      this._vectorTileRenderer.close()
    }
  }

  updateMaxFeatures (maxFeatures) {
    if (this._vectorTileRenderer) {
      this.vectorTileRenderer.updateMaxFeatures(maxFeatures)
    }
  }

  async styleChanged () {
    if (this._vectorTileRenderer) {
      await this.vectorTileRenderer.styleChanged()
    }
  }

  update (configuration) {
    super.update(configuration)
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        pane: 'vector',
        layerType: LayerTypes.VECTOR,
        extent: this._extent,
        count: this.count || 0,
        geopackageFilePath: this._geopackageFilePath,
        layerKey: this._layerKey,
        maxFeatures: this._maxFeatures,
        styleAssignment: this._styleAssignment,
        iconAssignment: this._iconAssignment,
        tableStyleAssignment: this._tableStyleAssignment,
        tableIconAssignment: this._tableIconAssignment
      }
    }
  }

  get count () {
    return this._features.length
  }

  get extent () {
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
}
