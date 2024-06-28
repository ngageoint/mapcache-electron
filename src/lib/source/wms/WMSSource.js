import Source from '../Source'
import WMSLayer from '../../layer/tile/WMSLayer'
import { WMS } from '../../layer/LayerTypes'
import { sleep } from '../../util/common/CommonUtilities'

export default class WMSSource extends Source {
  constructor (id, directory, filePath, layers = [], sourceName, format = 'image/png', withCredentials = false) {
    super(id, directory, filePath)
    this.layers = layers
    this.sourceName = sourceName
    this.format = format
    this.withCredentials = withCredentials
  }

  async retrieveLayers (statusCallback) {
    statusCallback('Processing WMS server', 0)
    await sleep(250)

    statusCallback('Storing WMS server data', 50)
    await sleep(250)

    if (this.layers.length === 0) {
      statusCallback('Cleaning up', 100)
      await sleep(250)
      return []
    } else {
      const version = this.layers[0].version
      const srs = this.layers[0].srs
      const { layerId, layerDirectory } = this.createLayerDirectory()
      statusCallback('Cleaning up', 100)
      await sleep(250)
      return [
        new WMSLayer({
          id: layerId,
          directory: layerDirectory,
          sourceDirectory: this.directory,
          filePath: this.filePath,
          name: this.sourceName,
          sourceLayerName: this.sourceName,
          layers: this.layers,
          srs: srs,
          version,
          format: this.format,
          layerType: WMS,
          withCredentials: this.withCredentials,
        })
      ]
    }
  }
}
