/* eslint-disable */
import jetpack from 'fs-jetpack'
import path from 'path'
import mkdirp from 'mkdirp'
import JSZip from 'jszip'
import KMLSource from './KMLSource'
import Source from './Source'
import _ from 'lodash'

export default class KMZSource extends Source {
  async initialize () {
    // unzip kmz
    const destinationFolder = this.sourceCacheFolder
    let data = jetpack.read(this.filePath, 'buffer')
    let zip = await JSZip.loadAsync(data)
    let keys = Object.keys(zip.files)
    this.name = path.basename(this.filePath, path.extname(this.filePath))
    this.kmlFileName = this.name + '.kml'
    for (let i = 0; i < keys.length; i++) {
      let filename = keys[i]
      await new Promise((resolve, reject) => {
       try {
         if (!_.isEmpty(path.extname(filename))) {
           zip.file(filename).async('nodebuffer').then((content) => {
             let destinationFileName = filename === 'doc.kml' ? this.kmlFileName : path.basename(filename)
             let destinationFilePath = path.join(destinationFolder, destinationFileName)
             if (destinationFileName.endsWith('.kml')) {
               this.kmlFileName = destinationFileName
             }
             try {
               mkdirp.sync(path.dirname(destinationFilePath))
               jetpack.write(destinationFilePath, content)
               resolve()
             } catch (e) {
               reject(e)
             }
           })
         }
       } catch (e) {
         reject(e)
       }
      })
    }

    this.filePath = path.join(destinationFolder, this.kmlFileName)
    this.kmlSource = new KMLSource(this.filePath)
    await this.kmlSource.initialize()
    this.kmlSource.removeSourceDir()
  }

  async retrieveLayers () {
    return this.kmlSource.retrieveLayers()
  }
}
