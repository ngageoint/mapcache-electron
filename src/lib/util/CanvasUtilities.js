export default class CanvasUtilities {
  static createCanvasFunction = () => null

  static setCreateCanvasFunction (f) {
    CanvasUtilities.createCanvasFunction = f
  }

  static createCanvas (width, height) {
    return CanvasUtilities.createCanvasFunction(width, height)
  }

  static hasTransparentPixels (canvas) {
    let result = false
    let data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 255) {
        result = true
        break
      }
    }
    return result
  }

  static isBlank (canvas) {
    let result = true
    let data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] !== 0) {
        result = false
        break
      }
    }
    return result
  }
}
