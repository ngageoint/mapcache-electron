import path from 'path'
import KMLGroundOverlayLayer from './source/layer/KMLGroundOverlayLayer'
import xml2js from 'xml2js'
import { useNamespaces } from 'xpath'

export default class KMLUtilities {
  static parseKML = async (kmlDom, iconBaseDir) => {
    const select = useNamespaces({'default': 'http://www.opengis.net/kml/2.2', 'gx': 'http://www.google.com/kml/ext/2.2', 'kml': 'http://www.opengis.net/kml/2.2', 'atom': 'http://www.w3.org/2005/Atom'})
    let parsedKML = {
      groundOverlays: [],
      documents: []
    }
    let groundOverlayDOMs = select('//default:GroundOverlay', kmlDom)
    for (let i = 0; i < groundOverlayDOMs.length; i++) {
      let groundOverlayDOM = groundOverlayDOMs[i]
      let xml = await new Promise((resolve, reject) => {
        new xml2js.Parser().parseString(groundOverlayDOM, function (err, json) {
          if (err) reject(err)
          resolve(json)
        })
      })
      console.log(xml.GroundOverlay)
      let iconPath = xml.GroundOverlay.Icon[0].href[0]
      let fullFile = path.join(iconBaseDir, iconPath)
      let east = xml.GroundOverlay.LatLonBox[0].east[0]
      let north = xml.GroundOverlay.LatLonBox[0].north[0]
      let west = xml.GroundOverlay.LatLonBox[0].west[0]
      let south = xml.GroundOverlay.LatLonBox[0].south[0]
      const extent = [Number(west), Number(south), Number(east), Number(north)]
      parsedKML.groundOverlays.push(new KMLGroundOverlayLayer({sourceLayerName: name, filePath: fullFile, extent: extent}))
    }

    let documentDOMs = select('//default:Document', kmlDom)
    for (let i = 0; i < documentDOMs.length; i++) {
      let xmlDoc = documentDOMs[i]
      let xml = await new Promise((resolve, reject) => {
        new xml2js.Parser().parseString(xmlDoc, function (err, json) {
          if (err) reject(err)
          resolve(json)
        })
      })
      const name = xml.Document.name && xml.Document.name.length === 1 ? xml.Document.name[0] : 'Document #' + i
      parsedKML.documents.push({name, xmlDoc})
    }
    return parsedKML
  }
}
