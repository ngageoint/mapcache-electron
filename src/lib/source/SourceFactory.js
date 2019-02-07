import path from 'path'
import GDALSource from './GDALSource'
import GeoPackageSource from './GeoPackageSource'

export default class SourceFactory {
  static constructUrlSource (url) {

  }

  static constructSource (filePath) {
    let type = path.extname(filePath).slice(1)

    console.log('Type: ', type)
    console.log('File: ', filePath)
    try {
      switch (type) {
        case 'gpkg':
        case 'geopackage':
          return new GeoPackageSource(filePath)
        default:
          return new GDALSource(filePath)
      }
    } catch (e) {
      console.log('Failed to open file ' + filePath, e)
      throw new Error('Failed to open file ' + filePath + ' ' + e.message)
    }
  }
}
