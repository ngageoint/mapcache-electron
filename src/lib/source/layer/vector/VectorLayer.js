import { GeoPackageAPI } from '@ngageoint/geopackage'
import Layer from '../Layer'
import LayerTypes from '../LayerTypes'

/**
 * VectorLayer is a 'Layer' within MapCache that is displayed on a map.
 * The VectorLayer uses the GeoPackage FeatureTiles API as an XYZ Tile Service to display
 * styled vector data from the GeoPackage on the map. The GeoPackage should be setup to contain
 * the feature collection of the data source as well as any user/source defined styling.
 */
export default class VectorLayer extends Layer {
  geopackage
  extent
  geopackageFilePath
  features
  layerKey
  count

  constructor (configuration = {}) {
    super(configuration)
    this.geopackageFilePath = configuration.geopackageFilePath
    this.count = configuration.count
    this.extent = configuration.extent
    this.layerKey = configuration.layerKey || 0
    this.styleAssignment = {table: null, featureId: -1}
    this.iconAssignment = {table: null, featureId: -1}
    this.tableStyleAssignment = {table: null, geometryType: -1}
    this.tableIconAssignment = {table: null, geometryType: -1}
  }

  async initialize () {
    this.geopackage = await GeoPackageAPI.open(this.geopackageFilePath)
    await super.initialize()
    return this
  }

  setRenderer (renderer) {
    this.renderer = renderer
    this.renderer.setGeoPackage(this.geopackage)
  }

  close () {
    if (this.renderer) {
      this.renderer.close()
    }
    if (this.geopackage) {
      try {
        this.geopackage.close()
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
      }
      this.geopackage = undefined
    }
  }

  updateMaxFeatures (maxFeatures) {
    if (this.renderer) {
      this.renderer.updateMaxFeatures(maxFeatures)
    }
  }

  async styleChanged () {
    this.close()
    this.geopackage = await GeoPackageAPI.open(this.filePath)
    if (this.renderer) {
      this.renderer.setGeoPackage(this.geopackage)
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
        extent: this.extent,
        count: this.count || 0,
        geopackageFilePath: this.geopackageFilePath,
        layerKey: this.layerKey,
        styleAssignment: this.styleAssignment,
        iconAssignment: this.iconAssignment,
        tableStyleAssignment: this.tableStyleAssignment,
        tableIconAssignment: this.tableIconAssignment
      }
    }
  }

  getRepaintFields() {
    return ['count'].concat(super.getRepaintFields())
  }

  async renderTile (coords, callback) {
    return this.renderer.renderTile(coords, callback)
  }
}
