let makeImageDataFunction = (width, height) => {
  // throw new Error('makeImageDataFunction Operation not configured.')
  return new ImageData(width, height)

}

let makeImageFunction = async (source) => {
  // throw new Error('makeImageFunction Operation not configured.')
  return new Promise((resolve, reject) => {
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

let createCanvasFunction = (width, height) => {
  // throw new Error('createCanvasFunction Operation not configured.')
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

let readPixelsFunction = (image) => {
  const canvas = createCanvasFunction(image.width, image.height)
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0)
  return context.getImageData(0, 0, image.width, image.height).data
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
