import Layer from '../Layer'
import { VECTOR } from '../LayerTypes'

/**
 * VectorLayer is a 'Layer' within MapCache that is displayed on a map.
 * The VectorLayer uses the GeoPackage FeatureTiles API as an XYZ Tile Service to display
 * styled vector data from the GeoPackage on the map. The GeoPackage should be setup to contain
 * the feature collection of the data source as well as any user/source defined styling.
 */
export default class VectorLayer extends Layer {
  extent
  geopackageFilePath
  features
  count

  constructor (configuration = {}) {
    super(configuration)
    this.geopackageFilePath = configuration.geopackageFilePath
    this.count = configuration.count
    this.extent = configuration.extent
  }

  setRenderer (renderer) {
    this.renderer = renderer
  }

  updateMaxFeatures (maxFeatures) {
    if (this.renderer) {
      this.renderer.updateMaxFeatures(maxFeatures)
    }
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        pane: 'vector',
        layerType: VECTOR,
        extent: this.extent,
        count: this.count || 0,
        geopackageFilePath: this.geopackageFilePath
      }
    }
  }

  getRepaintFields () {
    return ['count'].concat(super.getRepaintFields())
  }

  async renderTile (requestId, coords, size, callback) {
    return this.renderer.renderTile(requestId, coords, size, callback)
  }

  cancel (requestId) {
    this.renderer.cancel(requestId)
  }

  update (configuration = {}) {
    super.update(configuration)
    this.extent = configuration.extent
    this.count = configuration.count
    if (this.renderer) {
      this.renderer.update(configuration)
    }
  }
}
