import path from 'path'

/**
 * Handles generation of a source object given a source configuration. These objects will be used to retrieve data
 * source layers for use in the application
 */
export default class SourceFactory {
  static async constructSource (sourceConfiguration) {
    let source = null
    if (sourceConfiguration.serviceType !== null && sourceConfiguration.serviceType !== undefined) {
      if (sourceConfiguration.serviceType === 0) {
        source = new (require('./WMSSource').default)(sourceConfiguration.id, sourceConfiguration.directory, sourceConfiguration.url, sourceConfiguration.layers, sourceConfiguration.name, sourceConfiguration.format, sourceConfiguration.withCredentials)
      } else if (sourceConfiguration.serviceType === 1) {
        source = new (require('./WFSSource').default)(sourceConfiguration.id, sourceConfiguration.directory, sourceConfiguration.url, sourceConfiguration.layers, sourceConfiguration.name, sourceConfiguration.layerDatum)
      } else if (sourceConfiguration.serviceType === 2) {
        source = new (require('./XYZServerSource').default)(sourceConfiguration.id, sourceConfiguration.directory, sourceConfiguration.url, sourceConfiguration.subdomains, sourceConfiguration.name, sourceConfiguration.withCredentials)
      } else if (sourceConfiguration.serviceType === 3) {
        source = new (require('./ArcGISFeatureServiceSource').default)(sourceConfiguration.id, sourceConfiguration.directory, sourceConfiguration.url, sourceConfiguration.layers, sourceConfiguration.name, sourceConfiguration.layerDatum)
      }
    } else {
      const filePath = sourceConfiguration.file.path
      let type = path.extname(filePath).slice(1)
      try {
        switch (type) {
          case 'kml':
            source = new (require('./KMLSource').default)(sourceConfiguration.id, sourceConfiguration.directory, filePath)
            break
          case 'kmz':
            source = new (require('./KMZSource').default)(sourceConfiguration.id, sourceConfiguration.directory, filePath)
            break
          case 'zip':
            source = new (require('./ZipSource').default)(sourceConfiguration.id, sourceConfiguration.directory, filePath)
            break
          case 'shp':
            source = new (require('./ShapeFileSource').default)(sourceConfiguration.id, sourceConfiguration.directory, filePath)
            break
          case 'mbtiles':
            source = new (require('./MBTilesSource').default)(sourceConfiguration.id, sourceConfiguration.directory, filePath)
            break
          case 'json':
          case 'geojson':
            source = new (require('./GeoJSONSource').default)(sourceConfiguration.id, sourceConfiguration.directory, filePath)
            break
          case 'geotiff':
          case 'tif':
          case 'tiff':
            source = new (require('./GeoTIFFSource').default)(sourceConfiguration.id, sourceConfiguration.directory, filePath)
            break
          default:
            break
        }
      } catch (e) {
        throw new Error('Failed to open file ' + filePath + ' ' + e.message)
      }
    }
    return source
  }
}
