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
      extents: [-53.4, -79.1, 53.64, 79.1],
      drawBounds: {},
      boundsBeingDrawn: {},
      activeCount: 0,
      dark: false
    })
  },
  setProjectExtents (state, {projectId, extents}) {
    state[projectId].extents = extents
  },
  deleteProject (state, projectId) {
    Vue.delete(state, projectId)
  },
  setDarkTheme (state, {projectId, enabled}) {
    state[projectId].dark = enabled
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
  setDarkTheme ({ commit, state }, {projectId, enabled}) {
    commit('setDarkTheme', {projectId, enabled})
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
