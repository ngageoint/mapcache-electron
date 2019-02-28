import Vue from 'vue'
import WindowLauncher from '../../lib/window/WindowLauncher'

function createId () {
  function s4 () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}

const state = {
}

const getters = {
  getProjectById: (state) => (id) => {
    return state[id]
  }
}

const mutations = {
  pushProjectToProjects (state, project) {
    Vue.set(state, project.id, project)
  },
  setProjectName (state, {project, name}) {
    state[project.id].name = name
  },
  addProjectLayer (state, {project, layerId, config}) {
    Vue.set(state[project.id].layers, layerId, config)
  },
  addGeoPackage (state, {project, geopackage}) {
    if (!state[project.id].geopackages[geopackage.id]) {
      Vue.set(state[project.id].geopackages, geopackage.id, geopackage)
    }
    Vue.set(state[project.id], 'currentGeoPackage', geopackage.id)
  },
  toggleEditGeoPackage (state, {project, geopackageId}) {
    if (state[project.id].currentGeoPackage === geopackageId) {
      Vue.delete(state[project.id], 'currentGeoPackage')
    } else {
      Vue.set(state[project.id], 'currentGeoPackage', geopackageId)
    }
  },
  toggleProjectLayer (state, {projectId, layerId}) {
    Vue.set(state[projectId].layers[layerId], 'shown', !state[projectId].layers[layerId].shown)
  },
  setGeoPackageAOI (state, {projectId, geopackageId, aoi}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'aoi', aoi)
  },
  setMaxZoom (state, {projectId, geopackageId, maxZoom}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'maxZoom', maxZoom)
  },
  setMinZoom (state, {projectId, geopackageId, minZoom}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'minZoom', minZoom)
  },
  setGeoPackageLocation (state, { projectId, geopackageId, fileName }) {
    Vue.set(state[projectId].geopackages[geopackageId], 'fileName', fileName)
  },
  removeProjectLayer (state, {projectId, layerId}) {
    Vue.delete(state[projectId].layers, layerId)
  },
  deleteProject (state, project) {
    Vue.delete(state, project.id)
  }
}

const actions = {
  newProject ({ commit, state }) {
    let project = {
      id: createId(),
      name: 'New Project',
      layerCount: 0,
      layers: {},
      geopackages: {},
      currentGeoPackage: undefined
    }
    commit('pushProjectToProjects', project)
    actions.openProject({ commit, state }, project)
  },
  setProjectName ({ commit, state }, {project, name}) {
    commit('setProjectName', {project, name})
  },
  addProjectLayer ({ commit, state }, {project, layerId, config}) {
    commit('addProjectLayer', {project, layerId, config})
  },
  addGeoPackage ({ commit, state }, {project}) {
    console.log('project', project)
    let geopackage = {
      id: 'geopackage',
      layers: Object.keys(project.layers),
      aoi: undefined,
      minZoom: undefined,
      maxZoom: undefined,
      layerOptions: {}
    }
    commit('addGeoPackage', {project, geopackage})
  },
  toggleProjectLayer ({ commit, state }, {projectId, layerId}) {
    commit('toggleProjectLayer', {projectId, layerId})
  },
  removeProjectLayer ({ commit, state }, {projectId, layerId}) {
    commit('removeProjectLayer', {projectId, layerId})
  },
  setGeoPackageAOI ({ commit, state }, {projectId, geopackageId, aoi}) {
    commit('setGeoPackageAOI', {projectId, geopackageId, aoi})
  },
  setMinZoom ({ commit, state }, {projectId, geopackageId, minZoom}) {
    commit('setMinZoom', {projectId, geopackageId, minZoom})
  },
  setMaxZoom ({ commit, state }, {projectId, geopackageId, maxZoom}) {
    commit('setMaxZoom', {projectId, geopackageId, maxZoom})
  },
  setGeoPackageLocation ({ commit, state }, {projectId, geopackageId, fileName}) {
    commit('setGeoPackageLocation', {projectId, geopackageId, fileName})
  },
  deleteProject ({ commit, state }, project) {
    commit('deleteProject', project)
  },
  openProject ({ commit, state }, project) {
    WindowLauncher.launchProjectWindow(project.id)
  }
}

const modules = {
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
  modules
}
