import Source from './Source'
import path from 'path'
import AdmZip from 'adm-zip'
import ShapeFileSource from './ShapeFileSource'
import XYZFileSource from './XYZFileSource'
import isNil from 'lodash/isNil'

export default class ZipSource extends Source {
  async retrieveLayers () {
    let shapeFileSource
    let xyzFileSource
    let layers = []
    const destinationFolder = this.sourceCacheFolder
    const zip = new AdmZip(this.filePath)
    const zipEntries = zip.getEntries()
    const zipFileNames = zipEntries.map(zipEntry => zipEntry.entryName)
    const shapeFile = zipFileNames.find(file => file.endsWith('.shp'))
    const xyzImageFile = zipFileNames.find(file => file.match('.*\\d\\/\\d\\/\\d.png') !== null)

    if (!isNil(shapeFile)) {
      zip.extractAllTo(destinationFolder, true)
      const shapeFile = path.basename(shapeFile)
      try {
        this.filePath = path.join(destinationFolder, shapeFile)
        shapeFileSource = new ShapeFileSource(this.filePath, this.directory)
        layers = await shapeFileSource.retrieveLayers()
        shapeFileSource.cleanUp()
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e)
      }
    } else if (!isNil(xyzImageFile)) {
      xyzFileSource = new XYZFileSource(this.filePath, this.directory)
      layers = await xyzFileSource.retrieveLayers()
      xyzFileSource.cleanUp()
    }
    return layers
  }
}
