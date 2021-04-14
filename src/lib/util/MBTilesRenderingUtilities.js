import MBTilesUtilities from './MBTilesUtilities'
import CanvasUtilities from './CanvasUtilities'

/**
 * MBTilesRenderingUtilities
 */
export default class MBTilesRenderingUtilities {

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

  static _drawPoint = function(ctx, coordsArray, style, divisor) {
    const radius = style.radius
    ctx.save()
    ctx.beginPath()
    ctx.fillStyle = MBTilesRenderingUtilities.getColor(style.color, style.opacity)
    ctx.arc(coordsArray[0][0].x / divisor, coordsArray[0][0].y / divisor, radius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  static _drawLineString = function(ctx, coordsArray, style, divisor) {
    ctx.save()
    ctx.strokeStyle = MBTilesRenderingUtilities.getColor(style.color, style.opacity)
    ctx.lineWidth = style.width
    ctx.beginPath()
    for (let gidx in coordsArray) {
      let coords = coordsArray[gidx]
      coords.forEach((coord, i) => {
        const method = i === 0 ? 'moveTo' : 'lineTo'
        ctx[method](coord.x / divisor, coord.y / divisor)
      })
    }
    ctx.stroke()
    ctx.restore()
  }

  static _drawPolygon = function(ctx, coordsArray, style, divisor) {
    ctx.save()
    ctx.fillStyle = MBTilesRenderingUtilities.getColor(style.fillColor, style.fillOpacity)
    ctx.strokeStyle = MBTilesRenderingUtilities.getColor(style.color, style.opacity)
    ctx.lineWidth = style.width
    ctx.beginPath()
    for (let gidx = 0, len = coordsArray.length; gidx < len; gidx++) {
      let coords = coordsArray[gidx]
      coords.forEach((coord, i) => {
        const method = i === 0 ? 'moveTo' : 'lineTo'
        ctx[method](coord.x / divisor, coord.y / divisor)
      })
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  static requestTile (tileRequest) {
    return new Promise((resolve, reject) => {
      const {
        format,
        dbFile,
        coords,
        pointStyle,
        lineStyle,
        polygonStyle
      } = tileRequest
      let db
      try {
        db = MBTilesUtilities.getDb(dbFile)
        let base64Image = null
        if (format === 'pbf') {
          const drawingMap = {
            1: (ctx, coords, divisor) => {
              MBTilesRenderingUtilities._drawPoint(ctx, coords, pointStyle, divisor)
            },
            2: (ctx, coords, divisor) => {
              MBTilesRenderingUtilities._drawLineString(ctx, coords, lineStyle, divisor)
            },
            3: (ctx, coords, divisor) => {
              MBTilesRenderingUtilities._drawPolygon(ctx, coords, polygonStyle, divisor)
            }
          }
          const vectorTileFeatures = MBTilesUtilities.getVectorTileFeatures(db, coords.z, coords.x, coords.y)
          const canvas = CanvasUtilities.createCanvas(256, 256)
          const ctx = canvas.getContext('2d')
          for (let i = 0; i < vectorTileFeatures.length; i++) {
            const feature = vectorTileFeatures[i]
            drawingMap[feature.type](ctx, feature.loadGeometry(), feature.extent / 256)
          }
          base64Image = canvas.toDataURL('image/png')
        } else {
          base64Image = MBTilesUtilities.getTile(db, coords.z, coords.x, coords.y, format)
        }
        resolve(base64Image)
      } catch (e) {
        reject(e)
      } finally {
        MBTilesUtilities.close(db)
      }
    })
  }
}
