import TileLayer from './TileLayer'
import TileBoundingBoxUtils from '../../../tile/tileBoundingBoxUtils'
import proj4 from 'proj4'
import request from 'request-promise-native'
import { remote } from 'electron'
import GeoServiceUtilities from '../../../GeoServiceUtilities'

export default class WMSLayer extends TileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.layers = configuration.layers
  }

  async initialize () {
    this.version = this._configuration.version
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: 'WMS',
        version: this.version,
        layers: this.layers
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

  async renderTile (coords, tile, done) {
    let {x, y, z} = coords

    let tileBbox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
    // assumes projection from 3857 to 4326
    let tileUpperRight = proj4('EPSG:3857').inverse([tileBbox.maxLon, tileBbox.maxLat])
    let tileLowerLeft = proj4('EPSG:3857').inverse([tileBbox.minLon, tileBbox.minLat])
    let fullExtent = this.extent
    if (!TileBoundingBoxUtils.tileIntersects(tileUpperRight, tileLowerLeft, [fullExtent[2], fullExtent[3]], [fullExtent[0], fullExtent[1]])) {
      if (done) {
        return done(null, tile)
      }
      return
    }

    if (!tile) {
      tile = document.createElement('canvas')
      tile.width = 256
      tile.height = 256
    }

    let ctx = tile.getContext('2d')
    ctx.clearRect(0, 0, tile.width, tile.height)

    let referenceSystemName = 'srs'
    let bbox = tileBbox.minLon + ',' + tileBbox.minLat + ',' + tileBbox.maxLon + ',' + tileBbox.maxLat
    if (this.version === '1.3.0') {
      referenceSystemName = 'crs'
    }

    let options = {
      method: 'GET',
      url: GeoServiceUtilities.getTileRequestURL(this.filePath, this.layers, 256, 256, bbox, referenceSystemName, this.version),
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
