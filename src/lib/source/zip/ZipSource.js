import Source from '../Source'
import AdmZip from 'adm-zip'
import ShapeFileSource from '../shapefile/ShapeFileSource'
import KMZSource from '../kml/KMZSource'
import XYZFileSource from '../xyz/XYZFileSource'
import isNil from 'lodash/isNil'
import { sleep } from '../../util/common/CommonUtilities'

export default class ZipSource extends Source {
  async retrieveLayers (statusCallback) {
    statusCallback('Determining zip file contents', 0)
    await sleep(250)
    let shapeFileSource
    let kmzSource
    let xyzFileSource
    let layers = []
    const zip = new AdmZip(this.filePath)
    const zipEntries = zip.getEntries()
    const zipFileNames = zipEntries.map(zipEntry => zipEntry.entryName)
    const shapeFile = zipFileNames.find(file => file.endsWith('.shp'))
    const prjFile = zipFileNames.find(file => file.endsWith('.prj'))
    const tifFile = zipFileNames.find(file => file.endsWith('.tif'))
    const kmlFile = zipFileNames.find(file => file.endsWith('.kml'))
    const xyzImageFile = zipFileNames.find(file => file.match('.*\\d\\/\\d\\/\\d.png') !== null)

    if (!isNil(kmlFile)) {
      try {
        kmzSource = new KMZSource(this.id, this.directory, this.filePath)
        layers = await kmzSource.retrieveLayers(statusCallback)
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to retrieve kml file data.')
      }
    } else if (!isNil(shapeFile) || !isNil(prjFile) || !isNil(tifFile)) {
      try {
        shapeFileSource = new ShapeFileSource(this.id, this.directory, this.filePath)
        layers = await shapeFileSource.retrieveLayers(statusCallback)
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to retrieve shape file layer.')
      }
    } else if (!isNil(xyzImageFile)) {
      xyzFileSource = new XYZFileSource(this.id, this.directory, this.filePath)
      layers = await xyzFileSource.retrieveLayers(statusCallback)
    }

    return layers
  }
}
