/* eslint-disable */
import Source from './Source'
import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'
import KMLSource from "./KMLSource";

export default class KMZSource extends Source {
  async initialize () {
    // unzip kmz
    const destinationFolder = this.sourceCacheFolder.path()
    this.sourceCacheFolder.dir('files')
    let data = fs.readFileSync(this.filePath)
    let zip = await JSZip.loadAsync(data)
    let keys = Object.keys(zip.files)
    this.name = path.basename(this.filePath, path.extname(this.filePath))
    for (let i = 0; i < keys.length; i++) {
      let filename = keys[i]
      await new Promise((resolve) => {
        zip.file(filename).async('nodebuffer').then((content) => {
          let destinationFile = path.join(destinationFolder, filename);
          if (filename === 'doc.kml') {
            destinationFile = path.join(destinationFolder, this.name)
          }
          fs.writeFileSync(destinationFile, content);
          resolve()
        });
      })
    }
    this.filePath = path.join(this.sourceCacheFolder.file( this.name).path(), this.name)
    this.kmlSource = new KMLSource(this.filePath, this.sourceId)
    await this.kmlSource.initialize()
  }

  async retrieveLayers () {
    return this.kmlSource.retrieveLayers()
  }
}
