export default class CanvasUtilities {
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
}
