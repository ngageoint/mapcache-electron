import path from 'path'
import jetpack from 'fs-jetpack'
import Source from './Source'
import MBTilesLayer from './layer/tile/MBTilesLayer'
import VectorStyleUtilities from '../util/VectorStyleUtilities'
import MBTilesUtilities from '../util/MBTilesUtilities'

export default class MBTilesSource extends Source {
  async retrieveLayers () {
    let name = path.basename(this.filePath, path.extname(this.filePath))
    const { layerId, layerDirectory } = this.createLayerDirectory()
    let filePath = path.join(layerDirectory, path.basename(this.filePath))
    await jetpack.copyAsync(this.filePath, filePath)
    this.db = MBTilesUtilities.getDb(this.filePath)
    let info = MBTilesUtilities.getInfo(this.db)
    if (info.name) {
      name = info.name
    }
    if (info.format === null || info.format === undefined) {
      throw new Error('Unable to determine data format.')
    }

    return [
      new MBTilesLayer({
        id: layerId,
        directory: layerDirectory,
        sourceDirectory: this.directory,
        filePath: filePath,
        name: name,
        sourceLayerName: name,
        style: {1: VectorStyleUtilities.leafletStyle(), 2: VectorStyleUtilities.leafletStyle(), 3: VectorStyleUtilities.leafletStyle()}
      })
    ]
  }
}
