import Source from '../Source'
import WMSLayer from '../../layer/tile/WMSLayer'
import { WMS } from '../../layer/LayerTypes'

export default class WMSSource extends Source {
  constructor (id, directory, filePath, layers = [], sourceName, format = 'image/png', withCredentials = false) {
    super(id, directory, filePath)
    this.layers = layers
    this.sourceName = sourceName
    this.format = format
    this.withCredentials = withCredentials
    this.srs = this.layers[0].srs
  }
  async retrieveLayers (statusCallback) {
    statusCallback('Processing WMS server', 0)
    await this.sleep(250)

    statusCallback('Storing WMS server data', 50)
    await this.sleep(250)

    if (this.layers.length === 0) {
      statusCallback('Cleaning up', 100)
      await this.sleep(250)
      return []
    } else {
      const layerNames = this.layers.map(layer => layer.name)
      let extent = this.layers[0].extent
      this.layers.forEach(layer => {
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
      const version = this.layers[0].version
      const { layerId, layerDirectory } = this.createLayerDirectory()
      statusCallback('Cleaning up', 100)
      await this.sleep(250)
      return [
        new WMSLayer({
          id: layerId,
          directory: layerDirectory,
          sourceDirectory: this.directory,
          filePath: this.filePath,
          name: this.sourceName,
          sourceLayerName: this.sourceName,
          layers: layerNames,
          extent,
          version,
          format: this.format,
          layerType: WMS,
          withCredentials: this.withCredentials,
          srs: this.srs
        })
      ]
    }
  }
}
