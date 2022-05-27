import NetworkTileLayer from './NetworkTileLayer'
import cloneDeep from 'lodash/cloneDeep'

export default class MultiLayerNetworkTileLayer extends NetworkTileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.extent = MultiLayerNetworkTileLayer.getExtentForLayers(configuration.layers)
  }

  get configuration () {
    return {
      ...super.configuration,
    }
  }

  update (configuration) {
    super.update(configuration)
  }

  static getExtentForLayers (layers) {
    let extent = [-180, -90, 180, 90]
    let layersToReview = layers.filter(layer => layer.enabled)
    if (layersToReview.length === 0) {
      layersToReview = layers
    }
    layersToReview = layersToReview.filter(layer => layer.extent != null)

    if (layersToReview.length > 0) {
      extent = cloneDeep(layersToReview[0].extent)

      layersToReview.slice(1).forEach(layer => {
        if (layer.extent[0] < extent[0]) {
          extent[0] = layer.extent[0]
        }
        if (layer.extent[1] < extent[1]) {
          extent[1] = layer.extent[1]
        }
        if (layer.extent[2] > extent[2]) {
          extent[2] = layer.extent[2]
        }
        if (layer.extent[3] > extent[3]) {
          extent[3] = layer.extent[3]
        }
      })
    }

    return extent
  }
}
