import Source from './Source'
import path from 'path'
import JSZip from 'jszip'
import jetpack from 'fs-jetpack'
import GDALSource from './GDALSource'
import _ from 'lodash'
import mkdirp from 'mkdirp'

export default class ZipSource extends Source {
  constructor (filePath) {
    super (filePath)
    this.gdalSource = null
    this.layers = []
    this.shapeFile = null
  }

  async initialize () {
    const destinationFolder = this.sourceCacheFolder
    let data = jetpack.read(this.filePath, 'buffer')
    const zip = await JSZip.loadAsync(data)
    let keys = Object.keys(zip.files)
    if (!_.isNil(keys.find(file => file.endsWith('.shp')))) {
      for (let i = 0; i < keys.length; i++) {
        let filename = keys[i]
        await new Promise((resolve, reject) => {
          try {
            if (!_.isEmpty(path.extname(filename))) {
              zip.file(filename).async('nodebuffer').then((content) => {
                let destinationFileName = path.basename(filename)
                let destinationFilePath = path.join(destinationFolder, destinationFileName)
                if (destinationFileName.endsWith('.shp')) {
                  this.shapeFile = destinationFileName
                }
                try {
                  mkdirp.sync(path.dirname(destinationFilePath))
                  jetpack.write(destinationFilePath, content)
                  resolve()
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.error(e)
                  reject(e)
                }
              })
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e)
            reject(e)
          }
        })
      }
      try {
        this.filePath = path.join(destinationFolder, this.shapeFile)
        this.gdalSource = new GDALSource(this.filePath)
        this.gdalSource.removeSourceDir()
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e)
      }
    }
  }

  retrieveLayers () {
    return _.isNil(this.gdalSource) ? [] : this.gdalSource.retrieveLayers()
  }

}
