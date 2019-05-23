import path from 'path'
import request from 'request-promise-native'
import GDALSource from './GDALSource'
import GeoPackageSource from './GeoPackageSource'
import XYZServerSource from './XYZServerSource'
import KMLSource from './KMLSource'
import WMSSource from './WMSSource'
import WFSSource from './WFSSource'

export default class SourceFactory {
  static async constructUrlSource (parameterizedUrl) {
    // this is x,y,z tile server
    let url = parameterizedUrl.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0')
    let result = await request({
      method: 'HEAD',
      uri: url
    })
    console.log('result', result)
    return new XYZServerSource(parameterizedUrl)
  }

  static async constructWMSSource (url, layers) {
    // try to figure out what this thing is
    return new WMSSource(url, layers)
  }

  static async constructWFSSource (url, layers) {
    return new WFSSource(url, layers)
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
        case 'kml':
          let kmlSource = new KMLSource(filePath)
          kmlSource.initialize()
          return kmlSource
        default:
          return new GDALSource(filePath)
      }
    } catch (e) {
      console.log('Failed to open file ' + filePath, e)
      throw new Error('Failed to open file ' + filePath + ' ' + e.message)
    }
  }
}
