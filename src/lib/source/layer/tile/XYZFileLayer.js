import TileLayer from './TileLayer'
import jetpack from 'fs-jetpack'
import path from 'path'
import LayerTypes from '../LayerTypes'

export default class XYZFileLayer extends TileLayer {
  constructor (configuration = {}) {
    super (configuration)
    this.minZoom = configuration.minZoom
    this.maxZoom = configuration.maxZoom
  }

  async initialize () {
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: LayerTypes.XYZ_FILE,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom
      }
    }
  }

  get extent () {
    if (this._configuration.extent) {
      return this._configuration.extent
    }
    this._configuration.extent = [-180, -90, 180, 90]
    return this._configuration.extent
  }

  async renderTile (coords, tileCanvas, done) {
    let {x, y, z} = coords

    if (!tileCanvas) {
      tileCanvas = document.createElement('canvas')
      tileCanvas.width = 256
      tileCanvas.height = 256
    }
    let ctx = tileCanvas.getContext('2d')
    ctx.clearRect(0, 0, tileCanvas.width, tileCanvas.height)

    let tileData = null
    const tileFile = path.join(this.filePath, z.toString(), x.toString(), y.toString() + '.png')
    if (await jetpack.existsAsync(tileFile)) {
      const data = await jetpack.readAsync(tileFile, 'buffer')
      tileData = 'data:image/png;base64,' + Buffer.from(data).toString('base64')
      let image = new Image()
      image.onload = () => {
        ctx.drawImage(image, 0, 0)
        done(null, tileData)
      }
      image.src = tileData
    } else {
      done(null)
    }
    return tileData
  }
}
