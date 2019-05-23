import Vue from 'vue'
// import UIState from './UIState'
import WindowLauncher from '../../lib/window/WindowLauncher'

function createId () {
  function s4 () {
    return new Date().getTime()
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
    console.log('state', state)
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
  setCurrentGeoPackage (state, {projectId, geopackageId}) {
    Vue.set(state[projectId], 'currentGeoPackage', geopackageId)
  },
  setImageryLayersShareBounds (state, {projectId, geopackageId, sharesBounds}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'imageryLayersShareBounds', sharesBounds)
  },
  setFeatureLayersShareBounds (state, {projectId, geopackageId, sharesBounds}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'featureLayersShareBounds', sharesBounds)
  },
  updateGeopackageLayers (state, {projectId, geopackageId, imageryLayers, featureLayers}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'imageryLayers', imageryLayers)
    Vue.set(state[projectId].geopackages[geopackageId], 'featureLayers', featureLayers)
  },
  updateGeoPackageLayerIncluded (state, {projectId, geopackageId, group, layerId, included}) {
    Vue.set(state[projectId].geopackages[geopackageId][group][layerId], 'included', included)
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
  setGeoPackageStepNumber (state, {projectId, geopackageId, step}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'step', step)
  },
  setGeoPackageName (state, {projectId, geopackageId, name}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'name', name)
  },
  setGeoPackageLayerOptions (state, {projectId, geopackageId, layerId, options}) {
    Vue.set(state[projectId].geopackages[geopackageId].layerOptions, layerId, options)
  },
  setGeoPackageAOI (state, {projectId, geopackageId, layerId, aoi}) {
    console.log('aoi', aoi)
    while (aoi[0][1] < -180) {
      aoi[0][1] = aoi[0][1] + 360
    }
    while (aoi[0][1] > 180) {
      aoi[0][1] = aoi[0][1] - 360
    }
    while (aoi[1][1] < -180) {
      aoi[1][1] = aoi[1][1] + 360
    }
    while (aoi[1][1] > 180) {
      aoi[1][1] = aoi[1][1] - 360
    }
    if (layerId) {
      if (state[projectId].geopackages[geopackageId].imageryLayers[layerId]) {
        Vue.set(state[projectId].geopackages[geopackageId].imageryLayers[layerId], 'aoi', aoi)
      } else if (state[projectId].geopackages[geopackageId].featureLayers[layerId]) {
        Vue.set(state[projectId].geopackages[geopackageId].featureLayers[layerId], 'aoi', aoi)
      } else {
        Vue.set(state[projectId].geopackages[geopackageId], layerId, aoi)
      }
    } else {
      Vue.set(state[projectId].geopackages[geopackageId], 'aoi', aoi)
    }
  },
  setMaxZoom (state, {projectId, geopackageId, layerId, maxZoom}) {
    if (layerId) {
      if (state[projectId].geopackages[geopackageId].imageryLayers[layerId]) {
        Vue.set(state[projectId].geopackages[geopackageId].imageryLayers[layerId], 'maxZoom', maxZoom)
      } else if (state[projectId].geopackages[geopackageId].featureLayers[layerId]) {
        Vue.set(state[projectId].geopackages[geopackageId].featureLayers[layerId], 'maxZoom', maxZoom)
      }
    } else {
      Vue.set(state[projectId].geopackages[geopackageId], 'maxZoom', maxZoom)
    }
  },
  setMinZoom (state, {projectId, geopackageId, layerId, minZoom}) {
    if (layerId) {
      if (state[projectId].geopackages[geopackageId].imageryLayers[layerId]) {
        Vue.set(state[projectId].geopackages[geopackageId].imageryLayers[layerId], 'minZoom', minZoom)
      } else if (state[projectId].geopackages[geopackageId].featureLayers[layerId]) {
        Vue.set(state[projectId].geopackages[geopackageId].featureLayers[layerId], 'minZoom', minZoom)
      }
    } else {
      Vue.set(state[projectId].geopackages[geopackageId], 'minZoom', minZoom)
    }
  },
  setLayerName (state, {projectId, geopackageId, layerId, layerName}) {
    if (layerId) {
      if (state[projectId].geopackages[geopackageId].imageryLayers[layerId]) {
        Vue.set(state[projectId].geopackages[geopackageId].imageryLayers[layerId], 'layerName', layerName)
      } else if (state[projectId].geopackages[geopackageId].featureLayers[layerId]) {
        Vue.set(state[projectId].geopackages[geopackageId].featureLayers[layerId], 'layerName', layerName)
      }
    }
  },
  setGeoPackageLocation (state, { projectId, geopackageId, fileName }) {
    Vue.set(state[projectId].geopackages[geopackageId], 'fileName', fileName)
  },
  setGeoPackageStatus (state, {projectId, geopackageId, status}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'status', status)
  },
  removeProjectLayer (state, {projectId, layerId}) {
    Vue.delete(state[projectId].layers, layerId)
  },
  updateProjectLayer (state, {projectId, layer}) {
    console.log('update project layer', arguments)
    Vue.set(state[projectId].layers, layer.id, layer)
  },
  deleteProject (state, project) {
    Vue.delete(state, project.id)
  },
  deleteGeoPackage (state, {projectId, geopackageId}) {
    Vue.delete(state[projectId].geopackages, geopackageId)
  }
}

const actions = {
  newProject ({ dispatch, commit, state }) {
    let project = {
      id: createId(),
      name: 'New Project',
      layerCount: 0,
      layers: {},
      geopackages: {},
      currentGeoPackage: undefined
    }
    commit('UIState/addProjectState', {projectId: project.id}, { root: true })
    commit('pushProjectToProjects', project)
    console.log('adding project state')
    actions.openProject({ commit, state }, project)
  },
  setProjectName ({ commit, state }, {project, name}) {
    commit('setProjectName', {project, name})
  },
  addProjectLayer ({ commit, state }, {project, layerId, config}) {
    commit('addProjectLayer', {project, layerId, config})
  },
  addGeoPackage ({ commit, state }, {project}) {
    let name = project.name + ' GeoPackage'
    if (Object.keys(project.geopackages).length) {
      name += ' ' + Object.keys(project.geopackages).length
    }

    let imageryLayers = {}
    let featureLayers = {}
    for (const layerId in project.layers) {
      let layer = project.layers[layerId]
      if (layer.pane === 'tile' && !imageryLayers[layerId]) {
        imageryLayers[layerId] = {
          id: layer.id,
          included: layer.shown,
          name: layer.name,
          style: layer.style
        }
      }
      if (layer.pane === 'vector' && !featureLayers[layerId]) {
        featureLayers[layerId] = {
          id: layer.id,
          included: layer.shown,
          name: layer.name,
          style: layer.style
        }
      }
    }

    let geopackage = {
      id: createId(),
      name: name,
      layers: Object.keys(project.layers),
      aoi: undefined,
      minZoom: undefined,
      maxZoom: undefined,
      imageryLayers: imageryLayers,
      featureLayers: featureLayers,
      step: 1
    }
    commit('addGeoPackage', {project, geopackage})
  },
  setCurrentGeoPackage ({ commit, state }, {projectId, geopackageId}) {
    commit('setCurrentGeoPackage', {projectId, geopackageId})
  },
  setImageryLayersShareBounds ({ commit, state }, {projectId, geopackageId, sharesBounds}) {
    commit('setImageryLayersShareBounds', {projectId, geopackageId, sharesBounds})
  },
  setFeatureLayersShareBounds ({ commit, state }, {projectId, geopackageId, sharesBounds}) {
    commit('setFeatureLayersShareBounds', {projectId, geopackageId, sharesBounds})
  },
  updateGeopackageLayers ({ commit, state }, {projectId, geopackageId, imageryLayers, featureLayers}) {
    commit('updateGeopackageLayers', {projectId, geopackageId, imageryLayers, featureLayers})
  },
  updateGeoPackageLayerIncluded ({ commit, state }, {projectId, geopackageId, group, layerId, included}) {
    commit('updateGeoPackageLayerIncluded', {projectId, geopackageId, group, layerId, included})
  },
  toggleProjectLayer ({ commit, state }, {projectId, layerId}) {
    commit('toggleProjectLayer', {projectId, layerId})
  },
  removeProjectLayer ({ commit, state }, {projectId, layerId}) {
    commit('removeProjectLayer', {projectId, layerId})
  },
  updateProjectLayer ({ commit, state }, {projectId, layer}) {
    commit('updateProjectLayer', {projectId, layer})
  },
  setGeoPackageAOI ({ commit, state }, {projectId, geopackageId, layerId, aoi}) {
    commit('setGeoPackageAOI', {projectId, geopackageId, layerId, aoi})
  },
  setGeoPackageStepNumber ({ commit, state }, {projectId, geopackageId, step}) {
    commit('setGeoPackageStepNumber', {projectId, geopackageId, step})
  },
  setGeoPackageName ({ commit, state }, {projectId, geopackageId, name}) {
    commit('setGeoPackageName', {projectId, geopackageId, name})
  },
  setGeoPackageLayerOptions ({ commit, state }, {projectId, geopackageId, layerId, options}) {
    commit('setGeoPackageLayerOptions', {projectId, geopackageId, layerId, options})
  },
  setMinZoom ({ commit, state }, {projectId, geopackageId, layerId, minZoom}) {
    commit('setMinZoom', {projectId, geopackageId, layerId, minZoom})
  },
  setMaxZoom ({ commit, state }, {projectId, geopackageId, layerId, maxZoom}) {
    commit('setMaxZoom', {projectId, geopackageId, layerId, maxZoom})
  },
  setLayerName ({ commit, state }, {projectId, geopackageId, layerId, layerName}) {
    commit('setLayerName', {projectId, geopackageId, layerId, layerName})
  },
  setGeoPackageLocation ({ commit, state }, {projectId, geopackageId, fileName}) {
    commit('setGeoPackageLocation', {projectId, geopackageId, fileName})
  },
  setGeoPackageStatus ({ commit, state }, {projectId, geopackageId, status}) {
    commit('setGeoPackageStatus', {projectId, geopackageId, status})
  },
  deleteProject ({ commit, state }, project) {
    commit('deleteProject', project)
    commit('UIState/deleteProject', project.id, {root: true})
  },
  deleteGeoPackage ({ commit, state }, {projectId, geopackageId}) {
    console.log({projectId})
    console.log({geopackageId})
    commit('deleteGeoPackage', {projectId, geopackageId})
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
