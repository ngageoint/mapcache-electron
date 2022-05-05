import Source from '../Source'
import WMTSLayer from '../../layer/tile/WMTSLayer'
import { WMTS } from '../../layer/LayerTypes'

export default class WMTSSource extends Source {
  constructor (id, directory, filePath, layers, wmtsInfo, sourceName, withCredentials = false) {
    super(id, directory, filePath)
    this.layers = layers
    this.sourceName = sourceName
    this.wmtsInfo = wmtsInfo
    this.withCredentials = withCredentials
  }
  async retrieveLayers (statusCallback) {
    statusCallback('Processing WMTS server', 0)
    await this.sleep(250)

    statusCallback('Storing WMTS server data', 50)
    await this.sleep(250)

    const { layerId, layerDirectory } = this.createLayerDirectory()
    statusCallback('Cleaning up', 100)
    await this.sleep(250)
    return [
      new WMTSLayer({
        id: layerId,
        directory: layerDirectory,
        sourceDirectory: this.directory,
        filePath: this.filePath,
        name: this.sourceName,
        sourceLayerName: this.sourceName,
        layers: this.layers,
        wmtsInfo: this.wmtsInfo,
        version: '1.0.0',
        layerType: WMTS,
        withCredentials: this.withCredentials,
      })
    ]
  }
}
