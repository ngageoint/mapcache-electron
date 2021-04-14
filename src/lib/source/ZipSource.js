import Source from './Source'
import path from 'path'
import AdmZip from 'adm-zip'
import ShapeFileSource from './ShapeFileSource'
import XYZFileSource from './XYZFileSource'
import isNil from 'lodash/isNil'
import FileUtilities from "../util/FileUtilities";

export default class ZipSource extends Source {
  async retrieveLayers () {
    let shapeFileSource
    let xyzFileSource
    let layers = []
    const zip = new AdmZip(this.filePath)
    const zipEntries = zip.getEntries()
    const zipFileNames = zipEntries.map(zipEntry => zipEntry.entryName)
    const shapeFile = zipFileNames.find(file => file.endsWith('.shp'))
    const xyzImageFile = zipFileNames.find(file => file.match('.*\\d\\/\\d\\/\\d.png') !== null)

    if (!isNil(shapeFile)) {
      const unzippedDirectory = path.join(this.directory, 'unzipped')
      zip.extractAllTo(unzippedDirectory, true, undefined)
      try {
        shapeFileSource = new ShapeFileSource(this.id, this.directory, path.join(unzippedDirectory,  path.basename(shapeFile)))
        layers = await shapeFileSource.retrieveLayers()
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to retrieve shape file layer.')
      }
      FileUtilities.rmDir(unzippedDirectory)
    } else if (!isNil(xyzImageFile)) {
      xyzFileSource = new XYZFileSource(this.id, this.directory, this.filePath)
      layers = await xyzFileSource.retrieveLayers()
    }

    return layers
  }
}
