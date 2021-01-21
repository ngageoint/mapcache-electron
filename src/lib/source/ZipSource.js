import Source from './Source'
import path from 'path'
import AdmZip from 'adm-zip'
import ShapeFileSource from './ShapeFileSource'
import XYZFileSource from './XYZFileSource'
import _ from 'lodash'

export default class ZipSource extends Source {
  constructor (filePath) {
    super (filePath)
    this.shapeFileSource = null
    this.layers = []
    this.shapeFile = null
    this.xyzFileSource = null
  }

  async initialize () {
    const destinationFolder = this.sourceCacheFolder
    const zip = new AdmZip(this.filePath)
    const zipEntries = zip.getEntries()
    const zipFileNames = zipEntries.map(zipEntry => zipEntry.entryName)

    const shapeFile = zipFileNames.find(file => file.endsWith('.shp'))
    const xyzImageFile = zipFileNames.find(file => file.match('.*\\d\\/\\d\\/\\d.png') !== null)
    if (!_.isNil(shapeFile)) {
      zip.extractAllTo(destinationFolder, true)
      this.shapeFile = path.basename(shapeFile)
      try {
        this.filePath = path.join(destinationFolder, this.shapeFile)
        this.shapeFileSource = new ShapeFileSource(this.filePath)
        this.shapeFileSource.removeSourceDir()
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e)
      }
    } else if (!_.isNil(xyzImageFile)) {
      this.xyzFileSource = new XYZFileSource(this.filePath)
    }
  }

  retrieveLayers () {
    return _.isNil(this.shapeFileSource) ? (_.isNil(this.xyzFileSource) ? [] : this.xyzFileSource.retrieveLayers()) : this.shapeFileSource.retrieveLayers()
  }

}
