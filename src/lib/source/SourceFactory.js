import path from 'path'
import GeoTiffSource from './GeoTiffSource'
// import GeoJSONSource from './GeoJSONSource'
import GeoPackageSource from './GeoPackageSource'
import GdalVectorSource from './GdalVectorSource'
import KMZSource from './KMZSource'
import Vue from 'vue'
import * as Projects from '../projects'

export default class SourceFactory {
  constructor (options) {
    this.options = options
  }

  static async constructSource (configuration, project) {
    console.log('configuration', configuration)
    if (!configuration.file) {
      let file = {
        lastModified: configuration.lastModified,
        lastModifiedDate: configuration.lastModifiedDate,
        name: configuration.name,
        size: configuration.size,
        type: configuration.type,
        path: configuration.path
      }
      configuration.file = file
    }
    configuration.originalType = configuration.originalType || path.extname(configuration.file.name).slice(1)
    configuration.type = configuration.type || path.extname(configuration.file.name).slice(1)
    configuration.name = configuration.name || configuration.file.name
    configuration.shown = configuration.shown || true
    configuration.projectId = project.id

    console.log('Configuration Type: ', configuration.type)
    console.log('File: ', configuration.file.name)
    try {
      switch (configuration.type) {
        case 'geojson':
        case 'json':
        case 'zip':
        case 'shapefile':
        case 'shp':
        case 'gdal':
          configuration.type = 'gdal'
          let gdalSource = new GdalVectorSource(configuration, project)
          await gdalSource.initialize()
          return gdalSource
        case 'geotiff':
        case 'tiff':
        case 'tif':
          configuration.type = 'geotiff'
          let geotiffSource = new GeoTiffSource(configuration, project)
          await geotiffSource.initialize()
          return geotiffSource
        case 'gpkg':
        case 'geopackage':
          configuration.type = 'geopackage'
          let geopackageSource = new GeoPackageSource(configuration, project)
          await geopackageSource.initialize()
          return geopackageSource
        case 'kmz':
        case 'kml':
          configuration.type = 'kmz'
          let kmzSource = new KMZSource(configuration, project)
          await kmzSource.initialize()
          return kmzSource
        default:
          console.log('unknown file type', configuration)
          // just try to let gdal open it
          configuration.type = 'gdal'
          let defaultSource = new GdalVectorSource(configuration, project)
          await defaultSource.initialize()
          return defaultSource
      }
    } catch (e) {
      console.log('Failed to open file ' + configuration.file.path, e)
      throw new Error('Failed to open file ' + configuration.file.path + ' ' + e.message)
    }
  }

  saveSource (source) {
    Vue.set(this.options.project.sources, source.id, source)
    console.log('project', this.options.project)
    Projects.saveProject(this.options.project)
  }
}
