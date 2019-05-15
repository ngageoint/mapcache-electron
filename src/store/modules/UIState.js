import Vue from 'vue'

const state = {
}

const getters = {
  getUIStateByProjectId: (state) => (id) => {
    return state[id]
  }
}

const mutations = {
  addProjectState (state, {projectId}) {
    console.log('adding a project state for projectId', projectId)
    Vue.set(state, projectId, {
      extents: [-180, -90, 180, 90],
      drawBounds: {},
      boundsBeingDrawn: {}
    })
  },
  setProjectExtents (state, {projectId, extents}) {
    state[projectId].extents = extents
  },
  deleteProject (state, projectId) {
    Vue.delete(state, projectId)
  },
  activateDrawForGeoPackage (state, {projectId, geopackageId, layerId}) {
    console.log('Activate', arguments)
    if (state[projectId].drawBounds[geopackageId]) {
      if (layerId) {
        Vue.set(state[projectId].drawBounds[geopackageId], layerId, true)
        Vue.set(state[projectId].boundsBeingDrawn[geopackageId], layerId, [])
      } else {
        Vue.set(state[projectId].drawBounds[geopackageId], 'geopackage', true)
        Vue.set(state[projectId].boundsBeingDrawn[geopackageId], 'geopackage', [])
      }
    } else {
      Vue.set(state[projectId].drawBounds, geopackageId, {})
      Vue.set(state[projectId].boundsBeingDrawn, geopackageId, {})
      if (layerId) {
        Vue.set(state[projectId].drawBounds, geopackageId, {[layerId]: true})
        Vue.set(state[projectId].boundsBeingDrawn, geopackageId, {[layerId]: []})
      } else {
        Vue.set(state[projectId].drawBounds, geopackageId, {geopackage: true})
        Vue.set(state[projectId].boundsBeingDrawn, geopackageId, {geopackage: []})
      }
    }
  },
  deactivateDrawForGeoPackage (state, {projectId, geopackageId, layerId}) {
    if (layerId) {
      Vue.set(state[projectId].drawBounds[geopackageId], layerId, false)
    } else {
      Vue.set(state[projectId].drawBounds[geopackageId], 'geopackage', false)
    }
  },
  setDrawnBounds (state, {projectId, geopackageId, layerId, bounds}) {
    if (layerId) {
      Vue.set(state[projectId].boundsBeingDrawn[geopackageId], layerId, bounds)
    } else {
      Vue.set(state[projectId].boundsBeingDrawn[geopackageId], 'geopackage', bounds)
    }
  }
}

const actions = {
  addProjectState ({ commit, state }, id) {
    commit('addProjectState', id)
  },
  setProjectExtents ({ commit, state }, {projectId, extents}) {
    commit('setProjectExtents', {projectId, extents})
  },
  deleteProject ({ commit, state }, projectId) {
    commit('deleteProject', projectId)
  },
  activateDrawForGeoPackage ({ commit, state }, {projectId, geopackageId, layerId}) {
    commit('activateDrawForGeoPackage', {projectId, geopackageId, layerId})
  },
  deactivateDrawForGeoPackage ({ commit, state }, {projectId, geopackageId, layerId}) {
    commit('deactivateDrawForGeoPackage', {projectId, geopackageId, layerId})
  },
  setDrawnBounds ({ commit, state }, {projectId, geopackageId, layerId, bounds}) {
    console.log('set drawn bounds', {projectId, geopackageId, layerId, bounds})
    commit('setDrawnBounds', {projectId, geopackageId, layerId, bounds})
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
