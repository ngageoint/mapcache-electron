import jetpack from 'fs-jetpack'
import path from 'path'
import Source from './Source'
import GeoTiffLayer from './layer/tile/GeoTiffLayer'

export default class GeoTIFFSource extends Source {
  async retrieveLayers () {
    const { layerId, layerDirectory } = this.createLayerDirectory()
    let filePath = path.join(layerDirectory, path.basename(this.filePath))
    jetpack.copy(this.filePath, filePath)
    return [
      new GeoTiffLayer({
        id: layerId,
        directory: layerDirectory,
        filePath: filePath,
        sourceDirectory: this.directory
      })
    ]
  }
}
