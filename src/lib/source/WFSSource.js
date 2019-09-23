import Source from './Source'
import WFSLayer from './layer/vector/WFSLayer'

export default class WFSSource extends Source {
  async retrieveLayers () {
    this.wfsLayers = []
    for (const layer of this.layers) {
      this.wfsLayers.push(new WFSLayer({filePath: this.filePath, sourceLayerName: layer.name, extent: layer.extent, credentials: this.credentials, editableStyle: true}))
    }
    return this.wfsLayers
  }
}
