import path from 'path'
import request from 'request-promise-native'
import GDALSource from './GDALSource'
import GeoPackageSource from './GeoPackageSource'
import XYZServerSource from './XYZServerSource'

export default class SourceFactory {
  static async constructUrlSource (url) {
    // try to figure out what this thing is
    let result = await request({
      method: 'HEAD',
      uri: url
    })

    console.log('result', result)

    return new XYZServerSource(url)
  }

  static async constructSource (filePath) {
    if (filePath.startsWith('http')) {
      return SourceFactory.constructUrlSource(filePath)
    }
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
