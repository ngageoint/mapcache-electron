let makeImageDataFunction = (width, height) => {
  return new ImageData(width, height)
}

let makeImageFunction = async (source) => {
  return new Promise ((resolve, reject) => {
    const image = new Image()
    image.onload = function () {
      resolve(image)
    }
    image.onerror = function (e) {
      reject(e)
    }
    image.src = source
  })
}

let readPixelsFunction = (image) => {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0)
  return context.getImageData(0, 0, image.width, image.height).data
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

function setMakeImageFunction (f) {
  makeImageFunction = f
}

/**
 *
 * @param source
 * @returns {Promise<Image>}
 */
function makeImage (source) {
  return makeImageFunction(source)
}

function setReadPixelsFunction (f) {
  readPixelsFunction = f
}

function readPixels (image) {
  return readPixelsFunction(image)
}

function disposeImage (image) {
  if (image != null && image.delete) {
    image.delete()
    image = null
  }
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
  isBlank,
  disposeImage,
  setMakeImageFunction,
  makeImage,
  setReadPixelsFunction,
  readPixels
}
