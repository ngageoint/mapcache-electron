import Source from './Source'
import XYZServerLayer from './layer/tile/XYZServerLayer'

export default class XYZSource extends Source {
  async retrieveLayers () {
    const layers = []
    layers.push(new XYZServerLayer({filePath: this.filePath, subdomains: this.layers, sourceLayerName: this.sourceName, visible: false, credentials: this.credentials}))
    return layers
  }
}
