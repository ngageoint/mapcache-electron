import Source from './Source'
import XYZServerLayer from './layer/tile/XYZServerLayer'

export default class XYZSource extends Source {
  async retrieveLayers () {
    this.layers = []
    this.layers.push(new XYZServerLayer({filePath: this.filePath, sourceLayerName: 'XYZ', shown: true, credentials: this.credentials}))
    return this.layers
  }
}
