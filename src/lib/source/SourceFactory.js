import path from 'path'
import GDALSource from './GDALSource'
import GeoPackageSource from './GeoPackageSource'
import XYZServerSource from './XYZServerSource'
import KMLSource from './KMLSource'
import KMZSource from './KMZSource'
import WMSSource from './WMSSource'
import WFSSource from './WFSSource'

export default class SourceFactory {
  static async constructXYZSource (parameterizedUrl, credentials) {
    return new XYZServerSource(parameterizedUrl, [], credentials)
  }

  static async constructWMSSource (url, layers, credentials) {
    return new WMSSource(url, layers, credentials)
  }

  static async constructWFSSource (url, layers, credentials) {
    return new WFSSource(url, layers, credentials)
  }

  static async constructSource (filePath) {
    let type = path.extname(filePath).slice(1)
    try {
      let source = null
      switch (type) {
        case 'gpkg':
        case 'geopackage':
          source = new GeoPackageSource(filePath)
          break
        case 'kml':
          source = new KMLSource(filePath)
          await source.initialize()
          break
        case 'kmz':
          source = new KMZSource(filePath)
          await source.initialize()
          break
        default:
          source = new GDALSource(filePath)
          source.editableStyle = true
          source.doNotOverwriteMbStyle = false
          break
      }
      return source
    } catch (e) {
      console.log('Failed to open file ' + filePath, e)
      throw new Error('Failed to open file ' + filePath + ' ' + e.message)
    }
  }
}
