import { VECTOR } from '../../../layer/LayerTypes'
import ElectronTileRenderer from './ElectronTileRenderer'

/**
 * GeoPackage Vector Renderer
 */
export default class ElectronGeoPackageVectorRenderer extends ElectronTileRenderer {
  constructor(layer, isElectron) {
    super(layer, isElectron)
    this.performBoundaryCheck = false
  }

  updateMaxFeatures (maxFeatures) {
    this.maxFeatures = maxFeatures
  }

  getTileRequest (coords) {
    const request = super.getTileRequest(coords)
    return Object.assign(request, {
      tableName: this.layer.sourceLayerName,
      maxFeatures: this.maxFeatures,
      dbFile: this.layer.geopackageFilePath,
      styleKey: this.layer.styleKey,
      layerType: VECTOR
    })
  }
}
