import Source from '../Source'
import AdmZip from 'adm-zip'
import path from 'path'
import XYZFileLayer from '../../layer/tile/XYZFileLayer'
import { XYZ_FILE } from '../../layer/LayerTypes'

export default class XYZFileSource extends Source {
  async retrieveLayers (statusCallback) {
    statusCallback('Processing XYZ file zip', 5)
    await this.sleep(250)
    const { layerId, layerDirectory } = this.createLayerDirectory()

    const name = path.basename(this.filePath, path.extname(this.filePath))
    const zip = new AdmZip(this.filePath)
    const zipEntries = zip.getEntries()
    const zipFileNames = zipEntries.map(zipEntry => zipEntry.entryName)
    const xyzImageFile = zipFileNames.find(file => file.match('.*\\d\\/\\d\\/\\d.png') !== null)

    statusCallback('Extracting tiles', 33)
    await this.sleep(250)
    zip.extractAllTo(layerDirectory, true, undefined)
    // set this source's file path to the root directory where z directories live
    let filePath = layerDirectory
    const match = xyzImageFile.match('(.*)\\d\\/\\d\\/\\d.png')
    if (match.length === 2) {
      filePath = path.join(layerDirectory, match[1])
    }
    statusCallback('Determining min/max zoom levels', 66)
    await this.sleep(250)

    let minZoom
    let maxZoom
    try {
      const zoomLevels = zipFileNames.filter(file => file.match('.*\\d\\/\\d\\/\\d.png') !== null).map(file => parseInt(file.match('.*(\\d)\\/\\d\\/\\d.png')[1])).sort((a, b) => a - b)
      minZoom = zoomLevels[0]
      maxZoom = zoomLevels[zoomLevels.length - 1]
      // eslint-disable-next-line no-empty
    } catch (e) {}
    statusCallback('Cleaning up', 100)
    await this.sleep(250)
    return [
      new XYZFileLayer({
        id: layerId,
        layerType: XYZ_FILE,
        directory: layerDirectory,
        sourceDirectory: this.directory,
        filePath: filePath,
        sourceLayerName: name,
        extent: [-180, -90, 180, 90],
        minZoom,
        maxZoom
      })
    ]
  }
}
