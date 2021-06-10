import Source from './Source'
import WMSLayer from '../layer/tile/WMSLayer'
import { WMS } from '../layer/LayerTypes'

export default class WMSSource extends Source {
  constructor (id, directory, filePath, layers = [], sourceName, format = 'image/png') {
    super(id, directory, filePath)
    this.layers = layers
    this.sourceName = sourceName
    this.format = format
  }
  async retrieveLayers () {
    if (this.layers.length === 0) {
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
          layerType: WMS
        })
      ]
    }
  }
}
