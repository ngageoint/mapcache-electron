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

/**
 * Handles generation of a source object given a source configuration. These objects will be used to retrieve data
 * source layers for use in the application
 */
export default class SourceFactory {
  static async constructSource (sourceConfiguration) {
    let source = null
    if (sourceConfiguration.serviceType !== null && sourceConfiguration.serviceType !== undefined) {
      if (sourceConfiguration.serviceType === 0) {
        source = new WMSSource(sourceConfiguration.url, sourceConfiguration.directory, sourceConfiguration.layers, sourceConfiguration.name, sourceConfiguration.format)
      } else if (sourceConfiguration.serviceType === 1) {
        source = new WFSSource(sourceConfiguration.url, sourceConfiguration.directory, sourceConfiguration.layers, sourceConfiguration.name)
      } else if (sourceConfiguration.serviceType === 2) {
        source = new XYZServerSource(sourceConfiguration.url, sourceConfiguration.directory, sourceConfiguration.subdomains, sourceConfiguration.name)
      } else if (sourceConfiguration.serviceType === 3) {
        source = new ArcGISFeatureServiceSource(sourceConfiguration.url, sourceConfiguration.directory, sourceConfiguration.layers, sourceConfiguration.name)
      }
    } else {
      let type = path.extname(sourceConfiguration.file.path).slice(1)
      try {
        switch (type) {
          case 'kml':
            source = new KMLSource(sourceConfiguration.file.path, sourceConfiguration.directory)
            break
          case 'kmz':
            source = new KMZSource(sourceConfiguration.file.path, sourceConfiguration.directory)
            break
          case 'zip':
            source = new ZipSource(sourceConfiguration.file.path, sourceConfiguration.directory)
            break
          case 'shp':
            source = new ShapeFileSource(sourceConfiguration.file.path, sourceConfiguration.directory)
            break
          case 'mbtiles':
            source = new MBTilesSource(sourceConfiguration.file.path, sourceConfiguration.directory)
            break
          case 'json':
          case 'geojson':
            source = new GeoJSONSource(sourceConfiguration.file.path, sourceConfiguration.directory)
            break
          case 'geotiff':
          case 'tif':
          case 'tiff':
            source = new GeoTIFFSource(sourceConfiguration.file.path, sourceConfiguration.directory)
            break
          default:
            break
        }
      } catch (e) {
        throw new Error('Failed to open file ' + sourceConfiguration.file.path + ' ' + e.message)
      }
    }
    return source
  }
}
