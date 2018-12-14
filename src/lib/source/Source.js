import Vue from 'vue'
import { remote } from 'electron'
import jetpack from 'fs-jetpack'
import * as Projects from '../projects'

const app = remote.app
const userDataDir = jetpack.cwd(app.getPath('userData'))

export default class Source {
  constructor (configuration, project) {
    this.configuration = configuration
    this.project = project
    this.sourceId = this.configuration.id || this.generateSourceId()
  }

  get sourceCacheFolder () {
    return userDataDir.dir(this.sourceId)
  }

  get mapLayer () {
    throw new Error('Abstract method must be implemented in subclass')
  }

  async initialize () {
    throw new Error('Abstract method must be implemented in subclass')
  }

  generateLayerId () {
    return createId()
  }

  generateSourceId () {
    return createId()
  }

  saveSource (source) {
    source.id = source.id || this.generateSourceId()
    let project = this.project
    source.layers.forEach(function (layer) {
      layer.id = layer.id || this.generateLayerId()
      layer.zIndex = layer.zIndex || project.layerCount++
      layer.style = layer.style || {}
      layer.hidden = false
    }.bind(this))
    Vue.set(this.project.sources, source.id, source)
    Projects.saveProject(this.project)
  }
}

function createId () {
  function s4 () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}
