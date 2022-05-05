import Source from '../Source'
import XYZServerLayer from '../../layer/tile/XYZServerLayer'
import { XYZ_SERVER } from '../../layer/LayerTypes'

export default class XYZSource extends Source {
  constructor (id, directory, filePath, subdomains = [], sourceName, withCredentials = false, minZoom, maxZoom, extent, srs) {
    super (id, directory, filePath)
    this.subdomains = subdomains
    this.sourceName = sourceName
    this.withCredentials = withCredentials
    this.minZoom = minZoom
    this.maxZoom = maxZoom
    this.extent = extent
    this.srs = srs
  }

  async retrieveLayers (statusCallback) {
    statusCallback('Processing XYZ server', 0)
    await this.sleep(250)

    statusCallback('Storing XYZ server data', 50)
    await this.sleep(250)

    const { layerId, layerDirectory } = this.createLayerDirectory()

    statusCallback('Cleaning up', 100)
    await this.sleep(250)
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
        withCredentials: this.withCredentials,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
        extent: this.extent,
        srs: this.srs
      })
    ]
  }
}
