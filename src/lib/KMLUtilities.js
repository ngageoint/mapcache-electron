import path from 'path'
import { select } from 'xpath'
import fs from 'fs'
import axios from 'axios'
import { BoundingBox } from '@ngageoint/geopackage'
import Jimp from 'jimp'
import { transformRotate, bbox } from '@turf/turf'
import _ from 'lodash'
import FileUtilities from './FileUtilities'
import GeoTiffLayer from './source/layer/tile/GeoTiffLayer'
import GeoTIFFUtilities from './GeoTIFFUtilities'
import URLUtilities from './URLUtilities'


export default class KMLUtilities {

  static rotateBoundingBox(boundingBox, rotation) {
    // Convert to geoJson polygon format which turf can read.
    // turf rotates and returns a geoJson polygon
    const rotatedPoly = transformRotate(boundingBox.toGeoJSON().geometry, rotation);
    // Coverts the geoJson polygon to a geoJson bbox
    const rotatedBBox = bbox(rotatedPoly);
    // Converts geoJson bbox into a Geopackage js bounding box.
    const rotMinLongitude = rotatedBBox[0];
    const rotMinLatitude = rotatedBBox[1];
    const rotMaxLongitude = rotatedBBox[2];
    const rotMaxLatitude = rotatedBBox[3];
    return new BoundingBox(rotMinLongitude, rotMaxLongitude, rotMinLatitude, rotMaxLatitude);
  }

  static parseKML = async (kmlDom, iconBaseDir, sourceCacheDir) => {
    let parsedKML = {
      geotiffs: [],
      documents: []
    }
    let groundOverlayDOMs = kmlDom.getElementsByTagNameNS('*', 'GroundOverlay')
    for (let i = 0; i < groundOverlayDOMs.length; i++) {
      let groundOverlayDOM = groundOverlayDOMs[i]
      let name = 'Ground Overlay #' + i
      try {
        name = groundOverlayDOM.getElementsByTagNameNS('*', 'name')[0].childNodes[0].nodeValue
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
      }
      try {
        let iconPath = groundOverlayDOM.getElementsByTagNameNS('*', 'href')[0].childNodes[0].nodeValue
        let errored = false
        if (iconPath.startsWith('http')) {
          try {
            let fullFile = path.join(sourceCacheDir, path.basename(iconPath))
            const writer = fs.createWriteStream(fullFile)
            await new Promise((resolve) => {
              return axios({
                url: iconPath,
                responseType: 'arraybuffer'
              })
                .then(response => {
                  URLUtilities.bufferToStream(Buffer.from(response.data)).pipe(writer)
                  writer.on('finish', () => {
                    writer.close()
                    resolve()
                  })
                })
                .catch(err => {
                  fs.unlinkSync(fullFile)
                  // eslint-disable-next-line no-console
                  console.error(err)
                  resolve()
                })
            })

            iconPath = path.basename(iconPath)
            iconBaseDir = sourceCacheDir
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e)
            errored = true
          }
        }

        if (!errored) {
          let fullFile = path.join(iconBaseDir, iconPath)
          let image = await Jimp.read(fullFile)
          let east = groundOverlayDOM.getElementsByTagNameNS('*', 'east')[0].childNodes[0].nodeValue
          let north = groundOverlayDOM.getElementsByTagNameNS('*', 'north')[0].childNodes[0].nodeValue
          let west = groundOverlayDOM.getElementsByTagNameNS('*', 'west')[0].childNodes[0].nodeValue
          let south = groundOverlayDOM.getElementsByTagNameNS('*', 'south')[0].childNodes[0].nodeValue
          let rotation
          if (!_.isNil(groundOverlayDOM.getElementsByTagNameNS('*', 'rotation')[0])) {
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


          if (!_.isNil(rotation)) {
            if (fullFile.endsWith('.jpg') || fullFile.endsWith('.jpeg')) {
              fullFile = fullFile.substr(0, fullFile.lastIndexOf('.')) + '.png';
              await image.writeAsync(fullFile)
              image = await Jimp.read(fullFile)
            }
            rotation = parseFloat(rotation)
            image.rotate(rotation)
            boundingBox = KMLUtilities.rotateBoundingBox(boundingBox, rotation)

            // overwrite image
            await image.writeAsync(fullFile)
          }

          const extent = [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
          // ensure there is a unique directory for each geotiff
          const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
          const fileName = iconPath.substring(0, iconPath.lastIndexOf('.')) + '.tif'
          const geotiffFilePath = path.join(sourceDirectory, fileName)
          if (await GeoTIFFUtilities.convert4326ImageToGeoTIFF(fullFile, geotiffFilePath, extent)) {
            parsedKML.geotiffs.push(new GeoTiffLayer({filePath: geotiffFilePath, sourceLayerName: name, sourceDirectory: sourceDirectory, sourceId: sourceId}))
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('error looking for all documents, will just look for all geojson in file instead')
    }
    return parsedKML
  }
}
