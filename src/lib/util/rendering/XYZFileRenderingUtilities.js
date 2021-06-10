import path from 'path'
import jetpack from 'fs-jetpack'

function requestTile (tileRequest) {
  return new Promise((resolve) => {
    const {
      coords,
      filePath
    } = tileRequest
    let {x, y, z} = coords
    let tileData = null
    const tileFile = path.join(filePath, z.toString(), x.toString(), y.toString() + '.png')
    jetpack.existsAsync(tileFile).then(exists => {
      if (exists) {
        jetpack.readAsync(tileFile, 'buffer').then(data => {
          tileData = 'data:image/png;base64,' + Buffer.from(data).toString('base64')
          resolve(tileData)
        })
      } else {
        resolve(null)
      }
    }).catch(() => {
      resolve(null)
    })
  })
}

export {
  requestTile
}
