import jetpack from 'fs-jetpack'
import path from 'path'
import AdmZip from 'adm-zip'
import KMLSource from './KMLSource'
import Source from '../Source'
import { rmDirAsync } from '../../util/file/FileUtilities'
import { sleep } from '../../util/common/CommonUtilities'

/**
 * KMZSource represents a .kmz file
 */
export default class KMZSource extends Source {
  async retrieveLayers (statusCallback) {
    await sleep(250)
    // setup directory to extract kmz contents to
    const unzippedDirectory = path.join(this.directory, 'unzipped')

    await sleep(250)
    // extract kmz contents to the source directory
    const zip = new AdmZip(this.filePath)
    const zipEntries = zip.getEntries()
    const zipFileNames = zipEntries.map(zipEntry => zipEntry.entryName)
    zip.extractAllTo(unzippedDirectory, true, undefined)

    // name of kml in kmz is usually doc.kml, rename it to the name of the kmz file.
    const kmzFileName = path.basename(this.filePath, path.extname(this.filePath))
    const kmlFile = zipFileNames.find(file => file.endsWith('.kml'))
    const kmlFilePath = path.join(unzippedDirectory, kmlFile)
    const newKmlFileName = kmzFileName + '.kml'
    const newKmlFilePath = path.join(unzippedDirectory, newKmlFileName)
    if (newKmlFilePath.toLowerCase() !== kmlFilePath.toLowerCase()) {
      await jetpack.copyAsync(kmlFilePath, newKmlFilePath)
    }
    // now that kml and resources are established, pass along to a kml source to process
    const kmlSource = new KMLSource(this.id, this.directory, newKmlFilePath)
    const layers = await kmlSource.retrieveLayers(statusCallback)

    // remove unzipped directory
    rmDirAsync(unzippedDirectory).then((err) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to remove unzipped KMZ directory: ' + unzippedDirectory)
      }
    })

    return layers
  }
}
