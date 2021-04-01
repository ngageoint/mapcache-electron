import jetpack from 'fs-jetpack'
import path from 'path'
import AdmZip from 'adm-zip'
import KMLSource from './KMLSource'
import Source from './Source'

export default class KMZSource extends Source {
  async retrieveLayers () {
    const destinationFolder = this.sourceCacheFolder
    const zip = new AdmZip(this.filePath)
    const zipEntries = zip.getEntries()
    const zipFileNames = zipEntries.map(zipEntry => zipEntry.entryName)
    this.name = path.basename(this.filePath, path.extname(this.filePath))
    zip.extractAllTo(destinationFolder, true)
    const kmlFile = zipFileNames.find(file => file.endsWith('.kml'))
    const kmlFilePath = path.join(destinationFolder, kmlFile)
    this.kmlFileName = this.name + '.kml'
    this.filePath = path.join(destinationFolder, this.kmlFileName)
    await jetpack.copyAsync(kmlFilePath, this.filePath)
    const kmlSource = new KMLSource(this.filePath, this.directory)
    const layers = await kmlSource.retrieveLayers()
    kmlSource.cleanUp()
    return layers
  }
}
