import TileLayer from './TileLayer'
import axios from 'axios'

export default class XYZServerLayer extends TileLayer {
  async initialize () {
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: 'XYZServer'
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
    let headers = {}
    let credentials = this.credentials
    if (credentials && (credentials.type === 'basic' || credentials.type === 'bearer')) {
      headers['authorization'] = credentials.authorization
    }
    const response = await axios({
      method: 'get',
      responseType: 'arraybuffer',
      url: this.filePath.replace('{z}', coords.z).replace('{x}', coords.x).replace('{y}', coords.y),
      headers: headers
    })
    done(null, 'data:' + response.headers['content-type'] + ';base64,' + Buffer.from(response.data).toString('base64'))
    return response.body
  }
}
