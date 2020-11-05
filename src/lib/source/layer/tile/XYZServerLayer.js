import { remote } from 'electron'
import superagent from 'superagent'
import TileLayer from './TileLayer'

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
    let request = superagent.get(this.filePath.replace('{z}', coords.z).replace('{x}', coords.x).replace('{y}', coords.y))
    request.set('User-Agent', remote.getCurrentWebContents().session.getUserAgent())
    if (this.credentials && (this.credentials.type === 'basic' || this.credentials.type === 'bearer')) {
      request.set('Authorization', this.credentials.authorization)
    }
    const response = await request
    done(null, 'data:' + response.headers['content-type'] + ';base64,' + Buffer.from(response.body).toString('base64'))
    return response.body
  }
}
