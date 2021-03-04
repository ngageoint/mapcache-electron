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
import MBTilesSource from './MBTilesSource'

export default class SourceFactory {
  static async constructXYZSource (parameterizedUrl, subdomains = [], sourceName) {
    return new XYZServerSource(parameterizedUrl, subdomains, sourceName)
  }

  static async constructWMSSource (url, layers, sourceName, format) {
    return new WMSSource(url, layers, sourceName, format)
  }

  static async constructWFSSource (url, layers, sourceName) {
    return new WFSSource(url, layers, sourceName)
  }

  static async constructArcGISFeatureServiceSource (url, layers, sourceName) {
    return new ArcGISFeatureServiceSource(url, layers, sourceName)
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
        case 'mbtiles':
          source = new MBTilesSource(filePath)
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
