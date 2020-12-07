import path from 'path'
import XYZServerSource from './XYZServerSource'
import KMLSource from './KMLSource'
import KMZSource from './KMZSource'
import WMSSource from './WMSSource'
import WFSSource from './WFSSource'
import ArcGISFeatureServiceSource from './ArcGISFeatureServiceSource'
import ShapeFileSource from './ShapeFileSource'
import ZipSource from './ZipSource'
import GeoTIFFSource from './GeoTIFFSource'
import GeoJSONSource from './GeoJSONSource'

export default class SourceFactory {
  static async constructXYZSource (parameterizedUrl, credentials, sourceName) {
    return new XYZServerSource(parameterizedUrl, [], credentials, sourceName)
  }

  static async constructWMSSource (url, layers, credentials, sourceName) {
    return new WMSSource(url, layers, credentials, sourceName)
  }

  static async constructWFSSource (url, layers, credentials, sourceName) {
    return new WFSSource(url, layers, credentials, sourceName)
  }

  static async constructArcGISFeatureServiceSource (url, layers, credentials, sourceName) {
    return new ArcGISFeatureServiceSource(url, layers, credentials, sourceName)
  }

  static async constructSource (filePath) {
    let type = path.extname(filePath).slice(1)
    try {
      let source = null
      switch (type) {
        case 'kml':
          source = new KMLSource(filePath)
          await source.initialize()
          break
        case 'kmz':
          source = new KMZSource(filePath)
          await source.initialize()
          break
        case 'zip':
          source = new ZipSource(filePath)
          await source.initialize()
          break
        case 'shp':
          source = new ShapeFileSource(filePath)
          break
        case 'json':
        case 'geojson':
          source = new GeoJSONSource(filePath)
          break
        case 'geotiff':
        case 'tif':
        case 'tiff':
          source = new GeoTIFFSource(filePath)
          break
        default:
          break
      }
      return source
    } catch (e) {
      throw new Error('Failed to open file ' + filePath + ' ' + e.message)
    }
  }
}
