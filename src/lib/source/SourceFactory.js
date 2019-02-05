import path from 'path'
import GDALSource from './GDALSource'
// import GeoTiffSource from './GeoTiffSource'
// // import GeoJSONSource from './GeoJSONSource'
import GeoPackageSource from './GeoPackageSource'
// import GdalVectorSource from './GdalVectorSource'
// import KMZSource from './KMZSource'
// import Vue from 'vue'
// import * as Projects from '../projects'

export default class SourceFactory {
  static constructSource (filePath) {
    let type = path.extname(filePath).slice(1)

    console.log('Type: ', type)
    console.log('File: ', filePath)
    try {
      switch (type) {
        case 'gpkg':
        case 'geopackage':
          return new GeoPackageSource(filePath)
        // case 'kmz':
        //   return new KMZSource(filePath)
        default:
          return new GDALSource(filePath)
      }
    } catch (e) {
      console.log('Failed to open file ' + filePath, e)
      throw new Error('Failed to open file ' + filePath + ' ' + e.message)
    }
  }

  // saveSource (source) {
  //   Vue.set(this.options.project.sources, source.id, source)
  //   console.log('project', this.options.project)
  //   // Projects.saveProject(this.options.project)
  // }
}
