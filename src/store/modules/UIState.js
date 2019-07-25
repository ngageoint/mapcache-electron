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
    Vue.set(state, projectId, {
      extents: [-180, -90, 180, 90],
      drawBounds: {},
      boundsBeingDrawn: {},
      activeCount: 0
    })
  },
  setProjectExtents (state, {projectId, extents}) {
    state[projectId].extents = extents
  },
  deleteProject (state, projectId) {
    Vue.delete(state, projectId)
  },
  activateDrawForGeoPackage (state, {projectId, geopackageId, layerId}) {
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
        let drawBounds = {}
        drawBounds[layerId] = true
        let boundsBeingDrawn = {}
        boundsBeingDrawn[layerId] = []
        Vue.set(state[projectId].drawBounds, geopackageId, drawBounds)
        Vue.set(state[projectId].boundsBeingDrawn, geopackageId, boundsBeingDrawn)
      } else {
        Vue.set(state[projectId].drawBounds, geopackageId, {geopackage: true})
        Vue.set(state[projectId].boundsBeingDrawn, geopackageId, {geopackage: []})
      }
    }
    Vue.set(state[projectId], 'activeCount', state[projectId].activeCount + 1)
  },
  deactivateDrawForGeoPackage (state, {projectId, geopackageId, layerId}) {
    if (layerId) {
      Vue.set(state[projectId].drawBounds[geopackageId], layerId, false)
    } else {
      Vue.set(state[projectId].drawBounds[geopackageId], 'geopackage', false)
    }
    Vue.set(state[projectId], 'activeCount', state[projectId].activeCount - 1)
  },
  deactivateDrawForProject (state, {projectId}) {
    Object.keys(state[projectId].drawBounds).forEach(geopackageId => {
      Object.keys(state[projectId].drawBounds[geopackageId]).forEach(layerId => {
        Vue.set(state[projectId].drawBounds[geopackageId], layerId, false)
      })
    })
    Vue.set(state[projectId], 'activeCount', 0)
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
  deactivateDrawForProject ({ commit, state }, {projectId}) {
    commit('deactivateDrawForProject', {projectId})
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
