import path from 'path'
import { select } from 'xpath'
import fs from 'fs'
import { BoundingBox } from '@ngageoint/geopackage'
import jimp from './JimpUtilities'
import bbox from '@turf/bbox'
import transformRotate from '@turf/transform-rotate'
import isNil from 'lodash/isNil'
import * as GeoTIFF from 'geotiff'
import GeoTIFFSource from '../source/GeoTIFFSource'
import { getRemoteImage } from '../network/NetworkRequestUtils'

/**
 * Converts a 4326 jimp supported image into a geotiff
 * @param filePath
 * @param geotiffFilePath
 * @param extent
 * @returns {Promise<void>}
 */
async function convert4326ImageToGeoTIFF (filePath, geotiffFilePath, extent) {
  return new Promise(resolve => {
    jimp.read(filePath).then(image => {
      const values = new Uint8Array(image.bitmap.data)
      const metadata = {
        height: image.bitmap.height,
        width: image.bitmap.width,
        ModelPixelScale: [(extent[2] - extent[0]) / image.bitmap.width, (extent[3] - extent[1]) / image.bitmap.height, 0],
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
        console.error('Failed to convert Ground Overlay into 4326 GeoTIFF image.')
        resolve(false)
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

/**
 * @param kmlDom
 * @param kmlDirectory
 * @param tmpDir - used to store downloaded images
 * @param createLayerDirectory {Function}
 * @returns {Promise<{geotiffs: Array, documents: Array}>}
 */
async function parseKML (kmlDom, kmlDirectory, tmpDir, createLayerDirectory) {
  let parsedKML = {
    geotiffs: [],
    documents: []
  }

  // parse ground overlays
  let groundOverlayDOMs = kmlDom.getElementsByTagNameNS('*', 'GroundOverlay')
  for (let i = 0; i < groundOverlayDOMs.length; i++) {
    let groundOverlayDOM = groundOverlayDOMs[i]
    let name = 'Ground Overlay #' + i
    try {
      name = groundOverlayDOM.getElementsByTagNameNS('*', 'name')[0].childNodes[0].nodeValue
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get name of Ground Overlay.')
    }

    let fullFile

    try {
      let groundOverlayPath = groundOverlayDOM.getElementsByTagNameNS('*', 'href')[0].childNodes[0].nodeValue
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
        let image = await jimp.read(fullFile)
        let east = groundOverlayDOM.getElementsByTagNameNS('*', 'east')[0].childNodes[0].nodeValue
        let north = groundOverlayDOM.getElementsByTagNameNS('*', 'north')[0].childNodes[0].nodeValue
        let west = groundOverlayDOM.getElementsByTagNameNS('*', 'west')[0].childNodes[0].nodeValue
        let south = groundOverlayDOM.getElementsByTagNameNS('*', 'south')[0].childNodes[0].nodeValue
        let rotation
        if (!isNil(groundOverlayDOM.getElementsByTagNameNS('*', 'rotation')[0])) {
          rotation = groundOverlayDOM.getElementsByTagNameNS('*', 'rotation')[0].childNodes[0].nodeValue
        }

        if (west > 180.0) {
          west -= 360.0
        }

        if (east > 180.0) {
          east -= 360.0
        }

        if (north > 90.0) {
          north -= 180.0
        }

        if (south > 90.0) {
          south -= 180.0
        }

        let boundingBox = new BoundingBox(
          parseFloat(west), // minLongitude
          parseFloat(east), // maxLongitude
          parseFloat(south), // minLatitude
          parseFloat(north), // maxLatitude
        )


        // if image needs to be rotated, it will need to be converted to png, if not already and then rotation buffer will be written to that file
        if (!isNil(rotation)) {
          if (fullFile.endsWith('.jpg') || fullFile.endsWith('.jpeg')) {
            fullFile = fullFile.substr(0, fullFile.lastIndexOf('.')) + '.png';
            await image.writeAsync(fullFile)
            image = await jimp.read(fullFile)
          }
          rotation = parseFloat(rotation)
          image.rotate(rotation)
          boundingBox = rotateBoundingBox(boundingBox, rotation)

          // overwrite image
          await image.writeAsync(fullFile)
        }

        const extent = [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
        // ensure there is a unique directory for each geotiff
        const { layerId, layerDirectory, sourceDirectory } = createLayerDirectory()
        const fileName = path.basename(fullFile, path.extname(fullFile)) + '.tif'
        const geotiffFilePath = path.join(layerDirectory, fileName)
        if (await convert4326ImageToGeoTIFF(fullFile, geotiffFilePath, extent)) {
          const geotiffLayer = await GeoTIFFSource.createGeoTiffLayer(geotiffFilePath, name, layerId, layerDirectory, sourceDirectory)
          parsedKML.geotiffs.push(geotiffLayer)
        }
      }
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse Ground Overlays.')
    }
  }

  try {
    let documentDOMs = select('//*[local-name() = \'Document\']', kmlDom)
    for (let i = 0; i < documentDOMs.length; i++) {
      let xmlDoc = documentDOMs[i]
      let name = 'Document #' + i
      const nameNodes = xmlDoc.getElementsByTagNameNS('*', 'name')
      if (nameNodes.length > 0) {
        name = path.basename(nameNodes[0].childNodes[0].nodeValue)
      }
      parsedKML.documents.push({name, xmlDoc})
    }
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error looking for all documents, will just look for all geojson in file instead')
  }
  return parsedKML
}

export {
  convert4326ImageToGeoTIFF,
  parseKML,
  rotateBoundingBox
}
