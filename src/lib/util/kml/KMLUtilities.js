import path from 'path'
import fs from 'fs'
import { BoundingBox } from '@ngageoint/geopackage'
import bbox from '@turf/bbox'
import transformRotate from '@turf/transform-rotate'
import isNil from 'lodash/isNil'
import * as GeoTIFF from 'geotiff'
import GeoTIFFSource from '../../source/geotiff/GeoTIFFSource'
import { getRemoteImage } from '../../network/NetworkRequestUtils'
import { createCanvas, disposeCanvas, disposeImage, makeImage } from '../canvas/CanvasUtilities'
import { base64toUInt8Array } from '../Base64Utilities'

/**
 * Converts a 4326 jimp supported image into a geotiff
 * @param filePath
 * @param geotiffFilePath
 * @param extent
 * @returns {Promise<void>}
 */
async function convert4326ImageToGeoTIFF (filePath, geotiffFilePath, extent) {
  return new Promise(resolve => {
    const dataUrl = 'data:image/' + path.extname(filePath).substring(1) + ';base64,' + fs.readFileSync(filePath).toString('base64')
     makeImage(dataUrl).then(image => {
       const canvas = createCanvas(image.width(), image.height())
       const context = canvas.getContext('2d')
       context.drawImage(image, 0, 0)
       const imageData = context.getImageData(0, 0, image.width(), image.height())
       const values = new Uint8Array(imageData.data)
       const metadata = {
         height: image.height(),
         width: image.width(),
         ModelPixelScale: [(extent[2] - extent[0]) / image.width(), (extent[3] - extent[1]) / image.height(), 0],
         ModelTiepoint: [0, 0, 0, extent[0], extent[3], 0],
         PhotometricInterpretation: 2
       }
       GeoTIFF.writeArrayBuffer(values, metadata).then(arrayBuffer => {
         fs.writeFile(geotiffFilePath, Buffer.from(arrayBuffer), function (err) {
           if (err) {
             // eslint-disable-next-line no-console
             console.error('Failed to write GeoTIFF for KML Ground Overlay.')
             resolve(false)
           } else {
             resolve(true)
           }
         })
         // eslint-disable-next-line no-unused-vars
       }).catch(e => {
         // eslint-disable-next-line no-console
         console.error('Failed to convert kml ground overlay into 4326 GeoTIFF image.')
         resolve(false)
       }).finally(() => {
         disposeImage(image)
         disposeCanvas(canvas)
       })
     })
  })
}

function rotateBoundingBox(boundingBox, rotation) {
  // Convert to geoJson polygon format which turf can read.
  // turf rotates and returns a geoJson polygon
  const rotatedPoly = transformRotate(boundingBox.toGeoJSON().geometry, rotation)
  // Coverts the geoJson polygon to a geoJson bbox
  const rotatedBBox = bbox(rotatedPoly)
  // Converts geoJson bbox into a Geopackage js bounding box.
  const rotMinLongitude = rotatedBBox[0]
  const rotMinLatitude = rotatedBBox[1]
  const rotMaxLongitude = rotatedBBox[2]
  const rotMaxLatitude = rotatedBBox[3]
  return new BoundingBox(rotMinLongitude, rotMaxLongitude, rotMinLatitude, rotMaxLatitude)
}

async function rotateImage (filePath, rotation) {
  const dataUrl = 'data:image/' + path.extname(filePath).substring(1) + ';base64,' + fs.readFileSync(filePath).toString('base64')
  const image = await makeImage(dataUrl)
  const width = image.width()
  const height = image.height()
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  context.save()
  context.translate(width / 2,height / 2)
  context.rotate(rotation * Math.PI / 180.0)
  context.drawImage(image, width / -2,height / -2)
  context.restore()
  const data = base64toUInt8Array(canvas.toDataURL('image/png'))
  disposeImage(image)
  disposeCanvas(canvas)
  let pngFilePath = filePath
  if (!pngFilePath.endsWith('.png')) {
    pngFilePath = filePath.substr(0, filePath.lastIndexOf('.')) + '.png'
  }
  fs.writeFileSync(pngFilePath, data)
  return pngFilePath
}

async function convertGroundOverlayToGeotiffLayer (groundOverlay, kmlDirectory, tmpDir, createLayerDirectory) {
  const groundOverlayPath = groundOverlay.href
  let fullFile
  let geotiffLayer
  let errored = false
  if (groundOverlayPath.startsWith('http')) {
    try {
      fullFile = path.join(tmpDir, path.basename(groundOverlayPath))
      await getRemoteImage(groundOverlayPath, fullFile)
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to save Ground Overlay image.')
      errored = true
    }
  } else {
    // need to copy image to tmp directory
    const imageFile = path.join(kmlDirectory, groundOverlayPath)
    const tmpFile = path.join(tmpDir, path.basename(imageFile))
    fs.copyFileSync(imageFile, tmpFile)
    fullFile = tmpFile
  }

  if (!errored) {
    let east = groundOverlay.east
    let north = groundOverlay.north
    let west = groundOverlay.west
    let south = groundOverlay.south
    let rotation = groundOverlay.rotation
    while (west > 180.0) {
      west -= 360.0
    }
    while (east > 180.0) {
      east -= 360.0
    }
    while (north > 90.0) {
      north -= 180.0
    }
    while (south > 90.0) {
      south -= 180.0
    }
    let boundingBox = new BoundingBox(
      parseFloat(west), // minLongitude
      parseFloat(east), // maxLongitude
      parseFloat(south), // minLatitude
      parseFloat(north) // maxLatitude
    )

    // if image needs to be rotated, it will need to be converted to png, if not already and then rotation buffer will be written to that file
    if (!isNil(rotation)) {
      rotation = parseFloat(rotation)
      fullFile = await rotateImage(fullFile, rotation)
      boundingBox = rotateBoundingBox(boundingBox, rotation)
    }

    const extent = [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
    // ensure there is a unique directory for each geotiff
    const { layerId, layerDirectory, sourceDirectory } = createLayerDirectory()
    const fileName = path.basename(fullFile, path.extname(fullFile)) + '.tif'
    const geotiffFilePath = path.join(layerDirectory, fileName)
    if (await convert4326ImageToGeoTIFF(fullFile, geotiffFilePath, extent)) {
      geotiffLayer = await GeoTIFFSource.createGeoTiffLayer(geotiffFilePath, groundOverlay.name, layerId, layerDirectory, sourceDirectory)
    }
  }
  return geotiffLayer
}

export {
  rotateImage,
  convert4326ImageToGeoTIFF,
  rotateBoundingBox,
  convertGroundOverlayToGeotiffLayer
}
