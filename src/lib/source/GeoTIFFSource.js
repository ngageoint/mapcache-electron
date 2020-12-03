import Source from './Source'
import jetpack from 'fs-jetpack'
import GeoTiffLayer from './layer/tile/GeoTiffLayer'
import path from 'path'
import FileUtilities from '../FileUtilities'

export default class GeoTIFFSource extends Source {
  async retrieveLayers () {
    const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
    let filePath = path.join(sourceDirectory, path.basename(this.filePath))
    jetpack.copy(this.filePath, filePath)
    this.layers.push(new GeoTiffLayer({filePath: filePath, sourceDirectory, sourceId}))
    return this.layers
  }
}
