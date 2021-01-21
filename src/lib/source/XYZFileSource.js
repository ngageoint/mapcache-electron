import Source from './Source'
import AdmZip from 'adm-zip'
import path from 'path'
import XYZFileLayer from './layer/tile/XYZFileLayer'

export default class XYZFileSource extends Source {
  async retrieveLayers () {
    this.layers = []
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

    this.layers.push(new XYZFileLayer({filePath: filePath, sourceLayerName: name}))
    return this.layers
  }
}
