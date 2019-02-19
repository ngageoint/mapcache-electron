import Source from './Source'
import XYZServerLayer from './layer/XYZServerLayer'

export default class XYZSource extends Source {
  async retrieveLayers () {
    this.layers = []
    this.layers.push(new XYZServerLayer({filePath: this.filePath, sourceLayerName: 'XYZ', shown: true}))
    return this.layers
  }
}
