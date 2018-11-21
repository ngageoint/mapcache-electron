import path from 'path'
import GeoTiffSource from './GeoTiffSource'
import GeoJSONSource from './GeoJSONSource'
import Vue from 'vue'
import * as Projects from '../projects'

export default class SourceFactory {
  constructor (options) {
    this.options = options
  }

  static async constructSource (configuration, project) {
    if (!configuration.file) {
      let file = {
        lastModified: configuration.lastModified,
        lastModifiedDate: configuration.lastModifiedDate,
        name: configuration.name,
        size: configuration.size,
        type: configuration.type,
        path: configuration.path
      }
      configuration = {
        file: file,
        type: path.extname(file.name).slice(1),
        name: file.name,
        shown: true
      }
    }
    configuration.projectId = project.id

    switch (configuration.type) {
      case 'geojson':
      case 'json':
        configuration.type = 'geojson'
        let geoJsonSource = new GeoJSONSource(configuration, project)
        await geoJsonSource.initialize()
        return geoJsonSource
      case 'geotiff':
      case 'tiff':
      case 'tif':
        configuration.type = 'geotiff'
        let geotiffSource = new GeoTiffSource(configuration, project)
        await geotiffSource.initialize()
        return geotiffSource
      default:
        console.log('unknown file type', configuration)
    }
  }

  saveSource (source) {
    if (!source.id) {
      source.id = Projects.getId()
    }
    Vue.set(this.options.project.sources, source.id, source)
    console.log('project', this.options.project)
    Projects.saveProject(this.options.project)
  }
}
