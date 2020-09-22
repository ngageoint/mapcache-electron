import path from 'path'
import GeoTiffLayer from './source/layer/tile/GeoTiffLayer'
import GDALUtilities from './GDALUtilities'
import { select } from 'xpath'
import fs from 'fs'
import request from 'request'
import { remote } from 'electron'
import FileUtilities from './FileUtilities'

export default class KMLUtilities {
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
        console.error(error)
      }
      try {
        let iconPath = groundOverlayDOM.getElementsByTagNameNS('*', 'href')[0].childNodes[0].nodeValue
        let errored = false
        if (iconPath.startsWith('http')) {
          let options = {
            method: 'GET',
            uri: iconPath,
            encoding: null,
            headers: {
              'User-Agent': remote.getCurrentWebContents().session.getUserAgent()
            }
          }
          try {
            let fullFile = path.join(sourceCacheDir, path.basename(iconPath))
            let body = await new Promise(function (resolve, reject) {
              // Do async job
              request(options, function (err, resp, body) {
                if (err) {
                  reject(err)
                } else {
                  resolve(body)
                }
              })
            })
            const buffer = Buffer.from(body, 'utf8')
            fs.writeFileSync(fullFile, buffer)
            iconPath = path.basename(iconPath)
            iconBaseDir = sourceCacheDir
          } catch (e) {
            console.error(e)
            errored = true
          }
        } else {
          iconPath = path.basename(iconPath)
        }

        if (!errored) {
          let fullFile = path.join(iconBaseDir, iconPath)
          let east = groundOverlayDOM.getElementsByTagNameNS('*', 'east')[0].childNodes[0].nodeValue
          let north = groundOverlayDOM.getElementsByTagNameNS('*', 'north')[0].childNodes[0].nodeValue
          let west = groundOverlayDOM.getElementsByTagNameNS('*', 'west')[0].childNodes[0].nodeValue
          let south = groundOverlayDOM.getElementsByTagNameNS('*', 'south')[0].childNodes[0].nodeValue

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

          const extent = [Number(west), Number(south), Number(east), Number(north)]
          // ensure there is a unique directory for each geotiff
          const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
          const fileName = iconPath.substring(0, iconPath.lastIndexOf('.')) + '.tif'
          const geotiffFilePath = path.join(sourceDirectory, fileName)
          if (GDALUtilities.translateToGeoTiff(fullFile, geotiffFilePath, extent)) {
            parsedKML.geotiffs.push(new GeoTiffLayer({filePath: geotiffFilePath, visible: false, sourceLayerName: name, sourceDirectory: sourceDirectory, sourceId: sourceId}))
          }
        }
      } catch (error) {
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
      console.error('error looking for all documents, will just look for all geojson in file instead')
    }
    return parsedKML
  }
}
