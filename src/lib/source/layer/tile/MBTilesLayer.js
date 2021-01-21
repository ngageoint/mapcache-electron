import TileLayer from './TileLayer'
import MBTilesUtilities from '../../../MBTilesUtilities'
import GarbageCollector from '../../../GarbageCollector'

export default class MBTilesLayer extends TileLayer {
  minZoom
  maxZoom
  db
  constructor (configuration = {}) {
    super(configuration)
  }

  async initialize () {
    this.db = MBTilesUtilities.getDb(this.filePath)
    let info = MBTilesUtilities.getInfo(this.db)
    this.minZoom = info.minZoom || 0
    this.maxZoom = info.maxZoom || 20
    this.format = info.format === 'jpg' ? 'image/jpg' : 'image/png'
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: 'MBTiles',
        minZoom: this.minZoom,
        maxZoom: this.maxZoom
      }
    }
  }

  get extent () {
    return MBTilesUtilities.getInfo(this.db).bounds
  }

  close () {
    if (this.db) {
      try {
        this.db.close()
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
      }
      this.db = undefined
      GarbageCollector.tryCollect()
    }
  }

  async renderTile (coords, tile, done) {
    let {x, y, z} = coords
    if (!tile) {
      tile = document.createElement('canvas')
      tile.width = 256
      tile.height = 256
    }

    let ctx = tile.getContext('2d')
    ctx.clearRect(0, 0, tile.width, tile.height)

    let tileData = null
    try {
      tileData = MBTilesUtilities.getTile(this.db, z, x, y, this.format)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }

    try {
      if (tileData) {
        let image = new Image()
        image.onload = () => {
          ctx.drawImage(image, 0, 0)
          done(null, tileData)
        }
        image.src = tileData
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
      done(null)
    }

    return tileData
  }
}
