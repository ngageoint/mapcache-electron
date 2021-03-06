import Source from './Source'
import XYZServerLayer from '../layer/tile/XYZServerLayer'
import { XYZ_SERVER } from '../layer/LayerTypes'

export default class XYZSource extends Source {
  constructor (id, directory, filePath, subdomains = [], sourceName, withCredentials = false) {
    super (id, directory, filePath)
    this.subdomains = subdomains
    this.sourceName = sourceName
    this.withCredentials = withCredentials
  }

  async retrieveLayers () {
    const { layerId, layerDirectory } = this.createLayerDirectory()
    return [
      new XYZServerLayer({
        id: layerId,
        directory: layerDirectory,
        sourceDirectory: this.directory,
        filePath: this.filePath,
        subdomains: this.subdomains,
        sourceLayerName: this.sourceName,
        visible: false,
        layerType: XYZ_SERVER,
        withCredentials: this.withCredentials
      })
    ]
  }
}
