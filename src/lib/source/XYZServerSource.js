import Source from './Source'
import XYZServerLayer from './layer/tile/XYZServerLayer'

export default class XYZSource extends Source {
  async retrieveLayers () {
    const layers = []
    const { layerId, layerDirectory } = this.createLayerDirectory()
    layers.push(new XYZServerLayer({id: layerId, sourceDirectory: layerDirectory, filePath: this.filePath, subdomains: this.layers, sourceLayerName: this.sourceName, visible: false}))
    return layers
  }
}
