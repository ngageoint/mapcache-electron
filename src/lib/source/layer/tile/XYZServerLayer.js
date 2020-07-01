import request from 'request-promise-native'
import TileLayer from './TileLayer'
import { remote } from 'electron'

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
    let options = {
      method: 'GET',
      url: this.filePath.replace('{z}', coords.z).replace('{x}', coords.x).replace('{y}', coords.y),
      encoding: null,
      headers: {
        'User-Agent': remote.getCurrentWebContents().session.getUserAgent()
      },
      resolveWithFullResponse: true
    }
    if (this.credentials) {
      if (this.credentials.type === 'basic') {
        if (!options.headers) {
          options.headers = {}
        }
        options.headers['Authorization'] = this.credentials.authorization
      }
    }
    const result = await request(options)
    done(null, 'data:' + result.headers['content-type'] + ';base64,' + Buffer.from(result.body).toString('base64'))
    return result.body
  }
}
