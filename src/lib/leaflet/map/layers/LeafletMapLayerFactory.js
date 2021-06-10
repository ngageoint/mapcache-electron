import NetworkMapLayer from './NetworkMapLayer'
import DefaultMapLayer from './DefaultMapLayer'
import { isRemote } from '../../../layer/LayerTypes'

/**
 * Constructs a map layer from an initialized layer
 * @param options {layer: {}, mapPane: String, isPreview: Boolean, maxFeatures: Number}
 */
export function constructMapLayer (options) {
  const layer = options.layer
  const mapPane = options.mapPane || 'overlayPane'
  const isPreview = options.isPreview || false
  const maxFeatures = options.maxFeatures
  return isRemote(layer) ? NetworkMapLayer.constructMapLayer(layer, mapPane, isPreview) : DefaultMapLayer.constructMapLayer(layer, mapPane, maxFeatures)
}
