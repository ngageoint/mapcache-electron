/* eslint-disable */
import Source from './Source'
import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'
import KMLSource from './KMLSource'
import mkdirp from 'mkdirp'
import FileUtilities from '../FileUtilities'

export default class KMZSource extends Source {
  async initialize () {
    // unzip kmz
    const destinationFolder = this.sourceCacheFolder
    let data = fs.readFileSync(this.filePath)
    let zip = await JSZip.loadAsync(data)
    let keys = Object.keys(zip.files)
    this.name = path.basename(this.filePath, path.extname(this.filePath))
    this.kmlFileName = this.name + '.kml'
    for (let i = 0; i < keys.length; i++) {
      let filename = keys[i]
      await new Promise((resolve, reject) => {
        zip.file(filename).async('nodebuffer').then((content) => {
          let destinationFileName = filename === 'doc.kml' ? this.kmlFileName : path.basename(filename)
          let destinationFilePath = path.join(destinationFolder, destinationFileName)
          if (destinationFileName.endsWith('.kml')) {
            this.kmlFileName = destinationFileName
          }
          mkdirp(path.dirname(destinationFilePath), function (err) {
            if (err) reject(err);
            fs.writeFileSync(destinationFilePath, content)
            resolve()
          });
        });
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
