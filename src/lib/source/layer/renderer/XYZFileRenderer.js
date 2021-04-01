import jetpack from 'fs-jetpack'
import path from 'path'

export default class XYZFileLayer {
  layer
  constructor (layer) {
    this.layer = layer
  }

  async renderTile (coords, callback) {
    let {x, y, z} = coords
    let tileData = null
    const tileFile = path.join(this.layer.filePath, z.toString(), x.toString(), y.toString() + '.png')
    if (await jetpack.existsAsync(tileFile)) {
      const data = await jetpack.readAsync(tileFile, 'buffer')
      tileData = 'data:image/png;base64,' + Buffer.from(data).toString('base64')
      callback (null, tileData)
    } else {
      callback(null, null)
    }
  }
}
