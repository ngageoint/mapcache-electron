let makeImageDataFunction = (width, height) => {
  return new ImageData(width, height)
}

let createCanvasFunction = (width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function setCreateCanvasFunction (f) {
  createCanvasFunction = f
}

function createCanvas (width, height) {
  return createCanvasFunction(width, height)
}

function disposeCanvas (canvas) {
  if (canvas != null && canvas.dispose) {
    canvas.dispose()
    canvas = null
  }
}

function setMakeImageDataFunction (f) {
  makeImageDataFunction = f
}

function makeImageData (width, height) {
  return makeImageDataFunction(width, height)
}

function hasTransparentPixels (canvas) {
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

function isBlank (canvas) {
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

export {
  setCreateCanvasFunction,
  createCanvas,
  disposeCanvas,
  setMakeImageDataFunction,
  makeImageData,
  hasTransparentPixels,
  isBlank
}
