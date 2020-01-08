import Source from './Source'
import WMSLayer from './layer/tile/WMSLayer'
import UniqueIDUtilities from '../UniqueIDUtilities'

export default class WMSSource extends Source {
  async retrieveLayers () {
    this.wmsLayers = []
    for (const layer of this.layers) {
      this.wmsLayers.push(new WMSLayer({id: UniqueIDUtilities.createUniqueID(), filePath: this.filePath, sourceLayerName: layer.name, extent: layer.extent, credentials: this.credentials, version: layer.version}))
    }
    return this.wmsLayers
  }
}
