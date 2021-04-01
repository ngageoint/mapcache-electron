import Source from './Source'
import AdmZip from 'adm-zip'
import path from 'path'
import XYZFileLayer from './layer/tile/XYZFileLayer'

export default class XYZFileSource extends Source {
  async retrieveLayers () {
    const layers = []
    const destinationFolder = this.sourceCacheFolder
    const name = path.basename(this.filePath, path.extname(this.filePath))
    const zip = new AdmZip(this.filePath)
    const zipEntries = zip.getEntries()
    const zipFileNames = zipEntries.map(zipEntry => zipEntry.entryName)
    const xyzImageFile = zipFileNames.find(file => file.match('.*\\d\\/\\d\\/\\d.png') !== null)
    zip.extractAllTo(destinationFolder, true)
    // set this source's file path to the root directory where z directories live
    let filePath = destinationFolder
    const match = xyzImageFile.match('(.*)\\d\\/\\d\\/\\d.png')
    if (match.length === 2) {
      filePath = path.join(destinationFolder, match[1])
    }

    let minZoom
    let maxZoom
    try {
      const zoomLevels = zipFileNames.filter(file => file.match('.*\\d\\/\\d\\/\\d.png') !== null).map(file => parseInt(file.match('.*(\\d)\\/\\d\\/\\d.png')[1])).sort((a, b) => a - b)
      minZoom = zoomLevels[0]
      maxZoom = zoomLevels[zoomLevels.length - 1]
      // eslint-disable-next-line no-empty
    } catch (e) {}

    layers.push(new XYZFileLayer({filePath: filePath, sourceLayerName: name, minZoom, maxZoom}))
    return layers
  }
}
