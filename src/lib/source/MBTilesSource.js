import Source from './Source'
import MBTilesLayer from './layer/tile/MBTilesLayer'
import UniqueIDUtilities from '../UniqueIDUtilities'
import path from 'path'
import FileUtilities from '../FileUtilities'
import jetpack from 'fs-jetpack'
import MBTilesUtilities from '../MBTilesUtilities'

export default class MBTilesSource extends Source {
  async retrieveLayers () {
    const name = path.basename(this.filePath, path.extname(this.filePath))

    MBTilesUtilities.isValid(this.filePath)

    const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
    let filePath = path.join(sourceDirectory, path.basename(this.filePath))
    await jetpack.copyAsync(this.filePath, filePath)
    return [new MBTilesLayer({id: UniqueIDUtilities.createUniqueID(), filePath: filePath, name: name, sourceLayerName: name, sourceDirectory, sourceId})]
  }
}
