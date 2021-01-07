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
    Vue.set(state[project.id], 'name', name)
  },
  setDataSourceDisplayName (state, {projectId, sourceId, displayName}) {
    Vue.set(state[projectId].sources[sourceId], 'displayName', displayName)
  },
  addDataSources (state, {dataSources}) {
    dataSources.forEach(source => {
      Vue.set(state[source.project.id].sources, source.sourceId, source.config)
    })
  },
  setGeoPackage (state, {projectId, geopackage}) {
    Vue.set(state[projectId].geopackages, geopackage.id, geopackage)
  },
  setDataSource (state, {projectId, source}) {
    Vue.set(state[projectId].sources, source.id, source)
  },
  setProjectMaxFeatures (state, {projectId, maxFeatures}) {
    Vue.set(state[projectId], 'maxFeatures', maxFeatures)
  },
  renameGeoPackage (state, {projectId, geopackageId, newPath, newName}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'path', newPath)
    Vue.set(state[projectId].geopackages[geopackageId], 'name', newName)
  },
  setDataSourceVisible (state, {projectId, sourceId, visible}) {
    Vue.set(state[projectId].sources[sourceId], 'visible', visible)
  },
  removeDataSource (state, {projectId, sourceId}) {
    Vue.delete(state[projectId].sources, sourceId)
  },
  deleteProject (state, { projectId }) {
    Vue.delete(state, projectId)
  },
  removeGeoPackage (state, {projectId, geopackageId}) {
    Vue.delete(state[projectId].geopackages, geopackageId)
  },
  setZoomControlEnabled (state, {projectId, enabled}) {
    Vue.set(state[projectId], 'zoomControlEnabled', enabled)
  },
  setDisplayZoomEnabled (state, {projectId, enabled}) {
    Vue.set(state[projectId], 'displayZoomEnabled', enabled)
  },
  setDisplayAddressSearchBar (state, {projectId, enabled}) {
    Vue.set(state[projectId], 'displayAddressSearchBar', enabled)
  },
  clearActiveLayers (state, {projectId}) {
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
  },
  zoomToExtent (state, {projectId, extent}) {
    let key = 0
    if (state[projectId].zoomToExtent !== null && state[projectId].zoomToExtent !== undefined) {
      key = (state[projectId].zoomToExtent.key !== null && state[projectId].zoomToExtent.key !== undefined ? state[projectId].zoomToExtent.key : 0) + 1
    }
    Vue.set(state[projectId], 'zoomToExtent', {extent, key})
  },
  setBoundingBoxFilter (state, {projectId, boundingBoxFilter}) {
    Vue.set(state[projectId], 'boundingBoxFilter', boundingBoxFilter)
  },
  setBoundingBoxFilterEditingEnabled (state, {projectId, mode}) {
    Vue.set(state[projectId], 'boundingBoxFilterEditing', mode)
  },
  setBoundingBoxFilterEditingDisabled (state, {projectId}) {
    Vue.delete(state[projectId], 'boundingBoxFilterEditing')
  },
  showToolTips (state, {projectId, show}) {
    Vue.set(state[projectId], 'showToolTips', show)
  },
  clearBoundingBoxFilter (state, {projectId}) {
    const project = Object.assign({}, state[projectId])
    delete project.boundingBoxFilterEditing
    delete project.boundingBoxFilter
    Vue.set(state, projectId, project)
  },
  setActiveGeoPackage (state, {projectId, geopackageId}) {
    Vue.set(state[projectId], 'activeGeoPackage', {
      geopackageId: geopackageId,
      tableName: undefined,
      showFeaturesTableEvent: 0
    })
  },
  setActiveGeoPackageFeatureLayer (state, {projectId, geopackageId, tableName}) {
    Vue.set(state[projectId], 'activeGeoPackage', {
      geopackageId: geopackageId,
      tableName: tableName,
      showFeaturesTableEvent: 0
    })
  },
  resetState (state) {
    Object.keys(state).forEach(key => {
      Vue.delete(state, key)
    })
    Object.assign(state, getDefaultState())
  },
  editFeatureGeometry (state, {projectId, id, isGeoPackage, tableName, featureToEdit}) {
    Vue.set(state[projectId], 'editingFeature', {
      id: id,
      tableName: tableName,
      isGeoPackage: isGeoPackage,
      featureToEdit: featureToEdit
    })
  },
  clearEditFeatureGeometry (state, {projectId}) {
    Vue.delete(state[projectId], 'editingFeature')
  }
}

const actions = {
  newProject ({ commit }, { id, name }) {
    let project = {
      id: id,
      name: name || 'New Project',
      sources: {},
      geopackages: {},
      zoomToExtent: {
        key: 0
      },
      zoomControlEnabled: true,
      displayZoomEnabled: true,
      maxFeatures: 1000,
      boundingBoxFilterEditing: undefined,
      boundingBoxFilter: undefined,
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
  addDataSources ({ commit }, {dataSources}) {
    commit('addDataSources', {dataSources})
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
  clearActiveLayers ({ commit }, {projectId}) {
    commit('clearActiveLayers', {projectId})
  },
  zoomToExtent ({ commit }, {projectId, extent}) {
    commit('zoomToExtent', {projectId, extent})
  },
  setBoundingBoxFilter ({ commit }, {projectId, boundingBoxFilter}) {
    commit('setBoundingBoxFilter', {projectId, boundingBoxFilter})
  },
  setBoundingBoxFilterEditingEnabled ({ commit }, {projectId, mode}) {
    commit('setBoundingBoxFilterEditingEnabled', {projectId, mode})
  },
  setBoundingBoxFilterEditingDisabled ({ commit }, {projectId}) {
    commit('setBoundingBoxFilterEditingDisabled', {projectId})
  },
  clearBoundingBoxFilter ({ commit }, {projectId}) {
    commit('clearBoundingBoxFilter', {projectId})
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
