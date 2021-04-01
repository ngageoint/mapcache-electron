import MBTilesUtilities from '../../../util/MBTilesUtilities'
import CanvasUtilities from '../../../util/CanvasUtilities'

export default class MBTilesRenderer {
  db
  pointStyle
  lineStyle
  polygonStyle

  constructor (layer) {
    this.layer = layer
  }

  setStyle (pointStyle, lineStyle, polygonStyle) {
    this.pointStyle = pointStyle
    this.lineStyle = lineStyle
    this.polygonStyle = polygonStyle
  }

  setDb (db) {
    this.db = db
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

  static getColor (color, opacity) {
    let opacityText = '00'
    if (opacity > 0) {
      opacityText = Math.round(255 * opacity).toString(16).toUpperCase()
      if (opacityText.length === 1) {
        opacityText = '0' + opacityText
      }
    }
    return color + opacityText
  }

  _drawPoint = function(ctx, coordsArray, style, divisor) {
    const radius = style.radius
    ctx.beginPath()
    ctx.fillStyle = MBTilesRenderer.getColor(style.color, style.opacity)
    ctx.arc(coordsArray[0][0].x / divisor, coordsArray[0][0].y / divisor, radius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  _drawLineString = function(ctx, coordsArray, style, divisor) {
    ctx.strokeStyle = MBTilesRenderer.getColor(style.color, style.opacity)
    ctx.lineWidth = style.width
    ctx.beginPath()
    for (let gidx in coordsArray) {
      let coords = coordsArray[gidx]
      coords.forEach((coord, i) => {
        const method = i === 0 ? 'moveTo' : 'lineTo'
        ctx[method](coords.x / divisor, coords.y / divisor)
      })
    }
    ctx.stroke()
    ctx.restore()
  }

  _drawPolygon = function(ctx, coordsArray, style, divisor) {
    ctx.fillStyle = MBTilesRenderer.getColor(style.fillColor, style.fillOpacity)
    ctx.strokeStyle = MBTilesRenderer.getColor(style.color, style.opacity)
    ctx.lineWidth = style.width
    ctx.beginPath()
    for (let gidx = 0, len = coordsArray.length; gidx < len; gidx++) {
      let coords = coordsArray[gidx]
      coords.forEach((coord, i) => {
        const method = i === 0 ? 'moveTo' : 'lineTo'
        ctx[method](coords.x / divisor, coords.y / divisor)
      })
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  /**
   * Renders a tile
   * @param coords
   * @param callback
   * @returns {Promise<void>}
   */
  async renderTile (coords, callback) {
    let {x, y, z} = coords

    if (!this.db) {
      callback('Database is not defined', null)
    } else {
      let base64Image = null
      if (this.layer.format === 'pbf') {
        const vectorTileFeatures = MBTilesUtilities.getVectorTileFeatures(this.db, z, x, y)
        const canvas = CanvasUtilities.createCanvas(256, 256)
        const ctx = canvas.getContext('2d')
        for (let i = 0; i < vectorTileFeatures.length; i++) {
          vectorTileFeatures[i].coordinates = vectorTileFeatures[i].loadGeometry()
          await this._drawVectorTileFeature(ctx, vectorTileFeatures[i])
        }
        base64Image = canvas.toDataURL('image/png')
        callback(null, base64Image)
      } else {
        try {
          base64Image = MBTilesUtilities.getTile(this.db, z, x, y, this.layer.format)
          callback(null, base64Image)
        } catch (e) {
          callback(e, null)
        }
      }
    }
  }
}
