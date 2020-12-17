import Vue from 'vue'

const getDefaultState = () => {
  return {}
}

const state = getDefaultState()

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
    Vue.set(state[projectId], 'dark', enabled)
  },
  resetState (state) {
    Object.keys(state).forEach(key => {
      Vue.delete(state, key)
    })
    Object.assign(state, getDefaultState())
  }
}

const actions = {
  addProjectState ({ commit }, id) {
    commit('addProjectState', id)
  },
  setProjectExtents ({ commit }, {projectId, extents}) {
    commit('setProjectExtents', {projectId, extents})
  },
  deleteProject ({ commit }, projectId) {
    commit('deleteProject', projectId)
  },
  setDarkTheme ({ commit }, {projectId, enabled}) {
    commit('setDarkTheme', {projectId, enabled})
  },
  resetState ({ commit }) {
    return commit('resetState')
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
