import Source from './Source'
import WMSLayer from './layer/tile/WMSLayer'

export default class WMSSource extends Source {
  async retrieveLayers () {
    this.wmsLayers = []
    if (this.layers.length > 0) {
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
      this.wmsLayers.push(new WMSLayer({id: layerId, sourceDirectory: layerDirectory, filePath: this.filePath, name: this.sourceName, sourceLayerName: this.sourceName, layers: layerNames, extent, version, format: this.format}))
    }
    return this.wmsLayers
  }
}
