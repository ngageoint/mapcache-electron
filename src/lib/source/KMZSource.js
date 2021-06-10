import jetpack from 'fs-jetpack'
import path from 'path'
import AdmZip from 'adm-zip'
import KMLSource from './KMLSource'
import Source from './Source'
import { rmDir } from '../util/FileUtilities'

/**
 * KMZSource represents a .kmz file
 */
export default class KMZSource extends Source {
  async retrieveLayers () {
    // setup directory to extract kmz contents to
    const unzippedDirectory = path.join(this.directory, 'unzipped')

    // extract kmz contents to the source directory
    const zip = new AdmZip(this.filePath)
    const zipEntries = zip.getEntries()
    const zipFileNames = zipEntries.map(zipEntry => zipEntry.entryName)
    zip.extractAllTo(unzippedDirectory, true, undefined)

    // name of kml in kmz is usually doc.kml, rename it to the name of the kmz file
    const kmzFileName = path.basename(this.filePath, path.extname(this.filePath))
    const kmlFile = zipFileNames.find(file => file.endsWith('.kml'))
    const kmlFilePath = path.join(unzippedDirectory, kmlFile)
    const newKmlFileName = kmzFileName + '.kml'
    const newKmlFilePath = path.join(unzippedDirectory, newKmlFileName)
    await jetpack.renameAsync(kmlFilePath, newKmlFileName)

    // now that kml and resources are established, pass along to a kml source to process
    const kmlSource = new KMLSource(this.id, this.directory, newKmlFilePath)
    const layers = await kmlSource.retrieveLayers()

    // remove unzipped directory
    rmDir(unzippedDirectory)

    return layers
  }
}
