import TileLayer from './TileLayer'
import axios from 'axios'
import XYZTileUtilities from '../../../XYZTileUtilities'

export default class XYZServerLayer extends TileLayer {
  static LAYER_TYPE = 'XYZServer'

  constructor (configuration = {}) {
    super(configuration)
    this.subdomains = configuration.subdomains
  }

  async initialize () {
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: XYZServerLayer.LAYER_TYPE,
        subdomains: this.subdomains
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
    if (!tileCanvas) {
      tileCanvas = document.createElement('canvas')
      tileCanvas.width = 256
      tileCanvas.height = 256
    }
    let ctx = tileCanvas.getContext('2d')
    ctx.clearRect(0, 0, tileCanvas.width, tileCanvas.height)

    let url = XYZTileUtilities.generateUrlForTile(this.filePath, this.subdomains || [], coords.x, coords.y, coords.z)

    const response = await axios({
      method: 'get',
      responseType: 'arraybuffer',
      url: url
    })
    done(null, 'data:' + response.headers['content-type'] + ';base64,' + Buffer.from(response.data).toString('base64'))
    return response.body
  }
}
