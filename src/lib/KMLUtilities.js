import path from 'path'
import KMLGroundOverlayLayer from './source/layer/KMLGroundOverlayLayer'
import { select } from 'xpath'

export default class KMLUtilities {
  static parseKML = async (kmlDom, iconBaseDir) => {
    let parsedKML = {
      groundOverlays: [],
      documents: []
    }
    let groundOverlayDOMs = kmlDom.getElementsByTagNameNS('*', 'GroundOverlay')
    for (let i = 0; i < groundOverlayDOMs.length; i++) {
      let groundOverlayDOM = groundOverlayDOMs[i]
      let name = 'Ground Overlay #' + i
      try {
        name = groundOverlayDOM.getElementsByTagNameNS('*', 'name')[0].childNodes[0].nodeValue
      } catch (error) {
        console.log(error)
      }
      try {
        let iconPath = groundOverlayDOM.getElementsByTagNameNS('*', 'href')[0].childNodes[0].nodeValue
        let fullFile = path.join(iconBaseDir, iconPath)
        let east = groundOverlayDOM.getElementsByTagNameNS('*', 'east')[0].childNodes[0].nodeValue
        let north = groundOverlayDOM.getElementsByTagNameNS('*', 'north')[0].childNodes[0].nodeValue
        let west = groundOverlayDOM.getElementsByTagNameNS('*', 'west')[0].childNodes[0].nodeValue
        let south = groundOverlayDOM.getElementsByTagNameNS('*', 'south')[0].childNodes[0].nodeValue
        const extent = [Number(west), Number(south), Number(east), Number(north)]
        console.log(name)
        console.log(fullFile)
        console.log(extent)
        parsedKML.groundOverlays.push(new KMLGroundOverlayLayer({sourceLayerName: name, filePath: fullFile, extent: extent}))
      } catch (error) {
        console.log(error)
      }
    }

    let documentDOMs = select('//*[local-name() = \'Document\']', kmlDom)
    for (let i = 0; i < documentDOMs.length; i++) {
      let xmlDoc = documentDOMs[i]
      let name = 'Document #' + i
      const nameNodes = xmlDoc.getElementsByTagNameNS('*', 'name')
      if (nameNodes.length > 0) {
        name = nameNodes[0].childNodes[0].nodeValue
      }
      parsedKML.documents.push({name, xmlDoc})
    }
    return parsedKML
  }
}
