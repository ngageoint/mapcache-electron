import Vue from 'vue'
import * as Projects from '../projects'

export default class Source {
  constructor (configuration, project) {
    console.log('configuration', configuration)
    this.configuration = configuration
    this.project = project
  }

  get mapLayer () {
    throw new Error('Abstract method must be implemented in subclass')
  }

  async initialize () {
    throw new Error('Abstract method must be implemented in subclass')
  }

  saveSource (source) {
    if (!source.id) {
      source.id = Projects.getId()
    }
    this.sourceId = source.id
    Vue.set(this.project.sources, source.id, source)
    console.log('project', this.project)
    Projects.saveProject(this.project)
  }
}
