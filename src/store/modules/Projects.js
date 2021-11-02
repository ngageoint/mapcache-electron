import Vue from 'vue'

const getDefaultState = () => {
  return {}
}
const state = getDefaultState()

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
    if (state[project.id]) {
      Vue.set(state[project.id], 'name', name)
    }
  },
  setDataSourceDisplayName (state, {projectId, sourceId, displayName}) {
    if (state[projectId]) {
      Vue.set(state[projectId].sources[sourceId], 'displayName', displayName)
    }
  },
  addDataSources (state, {projectId, dataSources}) {
    if (state[projectId]) {
      dataSources.forEach(source => {
        Vue.set(state[projectId].sources, source.id, source.config)
      })
    }
  },
  setGeoPackage (state, {projectId, geopackage}) {
    if (state[projectId]) {
      Vue.set(state[projectId].geopackages, geopackage.id, geopackage)
    }
  },
  setDataSource (state, {projectId, source}) {
    if (state[projectId]) {
      Vue.set(state[projectId].sources, source.id, source)
    }
  },
  setProjectMaxFeatures (state, {projectId, maxFeatures}) {
    if (state[projectId]) {
      Vue.set(state[projectId], 'maxFeatures', maxFeatures)
    }
  },
  setDataSourceVisible (state, {projectId, sourceId, visible}) {
    if (state[projectId]) {
      Vue.set(state[projectId].sources[sourceId], 'visible', visible)
    }
  },
  removeDataSource (state, {projectId, sourceId}) {
    if (state[projectId]) {
      Vue.delete(state[projectId].sources, sourceId)
    }
  },
  deleteProject (state, { projectId }) {
    Vue.delete(state, projectId)
  },
  removeGeoPackage (state, {projectId, geopackageId}) {
    if (state[projectId]) {
      Vue.delete(state[projectId].geopackages, geopackageId)
    }
  },
  setZoomControlEnabled (state, {projectId, enabled}) {
    if (state[projectId]) {
      Vue.set(state[projectId], 'zoomControlEnabled', enabled)
    }
  },
  setDisplayZoomEnabled (state, {projectId, enabled}) {
    if (state[projectId]) {
      Vue.set(state[projectId], 'displayZoomEnabled', enabled)
    }
  },
  setDisplayAddressSearchBar (state, {projectId, enabled}) {
    if (state[projectId]) {
      Vue.set(state[projectId], 'displayAddressSearchBar', enabled)
    }
  },
  setDisplayCoordinates (state, {projectId, enabled}) {
    if (state[projectId]) {
      Vue.set(state[projectId], 'displayCoordinates', enabled)
    }
  },
  setDisplayScale (state, {projectId, enabled}) {
    if (state[projectId]) {
      Vue.set(state[projectId], 'displayScale', enabled)
    }
  },
  clearActiveLayers (state, {projectId}) {
    if (state[projectId]) {
      const projectCopy = Object.assign({}, state[projectId])
      Object.keys(projectCopy.geopackages).forEach(key => {
        const geopackage = projectCopy.geopackages[key]
        Object.keys(geopackage.tables.tiles).forEach(table => {
          geopackage.tables.tiles[table].visible = false
        })
        Object.keys(geopackage.tables.features).forEach(table => {
          geopackage.tables.features[table].visible = false
        })
      })
      Object.keys(projectCopy.sources).forEach(key => {
        const source = projectCopy.sources[key]
        source.visible = false
      })
      Vue.set(state, projectId, projectCopy)
    }
  },
  showToolTips (state, {projectId, show}) {
    if (state[projectId]) {
      Vue.set(state[projectId], 'showToolTips', show)
    }
  },
  setActiveGeoPackage (state, {projectId, geopackageId}) {
    if (state[projectId]) {
      Vue.set(state[projectId], 'activeGeoPackage', {
        geopackageId: geopackageId,
        tableName: undefined,
        showFeaturesTableEvent: 0
      })
    }
  },
  setActiveGeoPackageFeatureLayer (state, {projectId, geopackageId, tableName}) {
    if (state[projectId]) {
      Vue.set(state[projectId], 'activeGeoPackage', {
        geopackageId: geopackageId,
        tableName: tableName,
        showFeaturesTableEvent: 0
      })
    }
  },
  resetState (state) {
    Object.keys(state).forEach(key => {
      Vue.delete(state, key)
    })
    Object.assign(state, getDefaultState())
  },
  editFeatureGeometry (state, {projectId, id, isGeoPackage, tableName, featureToEdit}) {
    if (state[projectId]) {
      Vue.set(state[projectId], 'editingFeature', {
        id: id,
        tableName: tableName,
        isGeoPackage: isGeoPackage,
        featureToEdit: featureToEdit
      })
    }
  },
  clearEditFeatureGeometry (state, {projectId}) {
    if (state[projectId]) {
      Vue.delete(state[projectId], 'editingFeature')
    }
  },
  setMapRenderingOrder (state, {projectId, mapRenderingOrder}) {
    if (state[projectId]) {
      Vue.set(state[projectId], 'mapRenderingOrder', mapRenderingOrder)
    }
  },
  migrateState (state, {migratedState}) {
    Object.keys(state).forEach(key => {
      Vue.delete(state, key)
    })
    Object.assign(state, migratedState)
  }
}

const actions = {
  newProject ({ commit }, { id, name, directory }) {
    let project = {
      id: id,
      name: name || 'New Project',
      directory: directory,
      sources: {},
      geopackages: {},
      zoomControlEnabled: true,
      displayZoomEnabled: true,
      displayCoordinates: true,
      displayScale: true,
      maxFeatures: 1000,
      showToolTips: true,
      displayAddressSearchBar: true,
      activeGeoPackage: {
        geopackageId: undefined,
        tableName: undefined
      }
    }
    commit('UIState/addProjectState', {projectId: project.id}, { root: true })
    commit('pushProjectToProjects', project)
  },
  setProjectName ({ commit }, {project, name}) {
    commit('setProjectName', {project, name})
  },
  showToolTips ({ commit }, {projectId, show}) {
    commit('showToolTips', {projectId, show})
  },
  setDataSourceDisplayName ({ commit }, {projectId, sourceId, displayName}) {
    commit('setDataSourceDisplayName', {projectId, sourceId, displayName})
  },
  addDataSources ({ commit }, {projectId, dataSources}) {
    commit('addDataSources', {projectId, dataSources})
  },
  removeGeoPackage ({ commit }, {projectId, geopackageId}) {
    commit('removeGeoPackage', {projectId, geopackageId})
  },
  setDataSourceVisible ({ commit }, {projectId, sourceId, visible}) {
    commit('setDataSourceVisible', {projectId, sourceId, visible})
  },
  removeDataSource ({ commit }, {projectId, sourceId}) {
    commit('removeDataSource', {projectId, sourceId})
  },
  removeFeatureFromDataSource ({ commit }, {projectId, source}) {
    commit('setDataSource', {projectId, source: source})
  },
  deleteProject ({ commit }, { projectId }) {
    commit('deleteProject', { projectId })
  },
  setProjectMaxFeatures ({ commit }, {projectId, maxFeatures}) {
    commit('setProjectMaxFeatures', {projectId, maxFeatures})
  },
  setZoomControlEnabled ({ commit }, {projectId, enabled}) {
    commit('setZoomControlEnabled', {projectId, enabled})
  },
  setDisplayZoomEnabled ({ commit }, {projectId, enabled}) {
    commit('setDisplayZoomEnabled', {projectId, enabled})
  },
  setDisplayAddressSearchBar ({ commit }, {projectId, enabled}) {
    commit('setDisplayAddressSearchBar', {projectId, enabled})
  },
  setDisplayCoordinates ({ commit }, {projectId, enabled}) {
    commit('setDisplayCoordinates', {projectId, enabled})
  },
  setDisplayScale ({ commit }, {projectId, enabled}) {
    commit('setDisplayScale', {projectId, enabled})
  },
  clearActiveLayers ({ commit }, {projectId}) {
    commit('clearActiveLayers', {projectId})
  },
  setActiveGeoPackage ({ commit }, {projectId, geopackageId}) {
    commit('setActiveGeoPackage', {projectId, geopackageId})
  },
  setActiveGeoPackageFeatureLayer ({ commit }, {projectId, geopackageId, tableName}) {
    commit('setActiveGeoPackageFeatureLayer', {projectId, geopackageId, tableName})
  },
  setGeoPackage ({ commit }, {projectId, geopackage}) {
    commit('setGeoPackage', {projectId, geopackage})
  },
  setDataSource ({ commit }, {projectId, source}) {
    commit('setDataSource', {projectId, source})
  },
  resetState ({ commit }) {
    return commit('resetState')
  },
  editFeatureGeometry ({ commit }, {projectId, id, isGeoPackage, tableName, featureToEdit}) {
    commit('editFeatureGeometry', {projectId, id, isGeoPackage, tableName, featureToEdit})
  },
  clearEditFeatureGeometry ({ commit }, {projectId}) {
    commit('clearEditFeatureGeometry', {projectId})
  },
  setMapRenderingOrder ({ commit }, {projectId, mapRenderingOrder}) {
    commit('setMapRenderingOrder', {projectId, mapRenderingOrder})
  },
  migrateState ({commit}, {migratedState}) {
    commit('migrateState', {migratedState})
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
