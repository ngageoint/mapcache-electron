import TileLayer from './TileLayer'
import MBTilesUtilities from '../../../MBTilesUtilities'
import GarbageCollector from '../../../GarbageCollector'
import * as vendor from '../../../vendor'
import VectorStyleUtilities from '../../../VectorStyleUtilities'

export default class MBTilesLayer extends TileLayer {
  minZoom
  maxZoom
  db
  pointStyle
  lineStyle
  polygonStyle
  constructor (configuration = {}) {
    super(configuration)
  }

  async initialize () {
    this.db = MBTilesUtilities.getDb(this.filePath)
    let info = MBTilesUtilities.getInfo(this.db)
    if (info.minZoom === undefined || info.maxZoom === undefined) {
      let zoomRange = MBTilesUtilities.getZoomRange(this.db)
      this.minZoom = zoomRange.min
      this.maxZoom = zoomRange.max
    } else {
      this.minZoom = info.minZoom
      this.maxZoom = info.maxZoom
    }
    if (info.format !== null) {
      switch (info.format) {
        case 'pbf':
          this.format = 'pbf'
          break
        case 'jpg':
          this.format = 'image/jpg'
          break
        default:
          this.format = 'image/png'
          break
      }
    } else {
      throw new Error('Unable to determine data format.')
    }

    this.pointStyle = this._configuration.pointStyle || VectorStyleUtilities.leafletStyle()
    this.lineStyle = this._configuration.lineStyle || VectorStyleUtilities.leafletStyle()
    this.polygonStyle = this._configuration.polygonStyle || VectorStyleUtilities.leafletStyle()
    await super.initialize()
    return this
  }

  updateStyle (style) {
    this.style = style
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: 'MBTiles',
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
        pointStyle: this.pointStyle,
        lineStyle: this.lineStyle,
        polygonStyle: this.polygonStyle,
        format: this.format
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

  _drawVectorTileFeature (ctx, vtf) {
    switch (vtf.type) {
      case 1: //Point
        this._drawPoint(ctx, vtf.coordinates, this.pointStyle, vtf.extent / 256)
        break
      case 2: //LineString
        this._drawLineString(ctx, vtf.coordinates, this.lineStyle, vtf.extent / 256)
        break
      case 3: //Polygon
        this._drawPolygon(ctx, vtf.coordinates, this.polygonStyle, vtf.extent / 256)
        break
      default:
        throw new Error('Unmanaged type: ' + vtf.type)
    }
  }

  _drawPoint = function(ctx, coordsArray, style, divisor) {
    const radius = style.radius
    let p = MBTilesLayer._tilePoint(coordsArray[0][0], divisor)
    ctx.beginPath()
    ctx.fillStyle = style.color + (255 * style.opacity).toString(16).toUpperCase()
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  _drawLineString = function(ctx, coordsArray, style, divisor) {
    ctx.strokeStyle = style.color + (255 * style.opacity).toString(16).toUpperCase()
    ctx.lineWidth = style.width
    ctx.beginPath()
    for (let gidx in coordsArray) {
      let coords = coordsArray[gidx]
      coords.forEach((coord, i) => {
        const method = i === 0 ? 'moveTo' : 'lineTo'
        const proj = MBTilesLayer._tilePoint(coord, divisor)
        ctx[method](proj.x, proj.y)
      })
    }
    ctx.stroke()
    ctx.restore()
  }

  _drawPolygon = function(ctx, coordsArray, style, divisor) {
    ctx.fillStyle = style.fillColor + (255 * style.fillOpacity).toString(16).toUpperCase()
    ctx.strokeStyle = style.color + (255 * style.opacity).toString(16).toUpperCase()
    ctx.lineWidth = style.width
    ctx.beginPath()
    for (let gidx = 0, len = coordsArray.length; gidx < len; gidx++) {
      let coords = coordsArray[gidx]
      coords.forEach((coord, i) => {
        const method = i === 0 ? 'moveTo' : 'lineTo'
        const proj = MBTilesLayer._tilePoint(coord, divisor)
        ctx[method](proj.x, proj.y)
      })
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  static _tilePoint = function(coords, divisor) {
    return new vendor.L.Point(coords.x / divisor, coords.y / divisor)
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
    if (this.format === 'pbf') {
      const vectorTileFeatures = MBTilesUtilities.getVectorTileFeatures(this.db, z, x, y)
      for (let i = 0; i < vectorTileFeatures.length; i++) {
        vectorTileFeatures[i].coordinates = vectorTileFeatures[i].loadGeometry()
        await this._drawVectorTileFeature(ctx, vectorTileFeatures[i])
      }
      tileData = tile.toDataURL('image/png')
      done(null, tileData)
    } else {
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
    }
  }
}
