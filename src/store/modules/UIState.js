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
      dark: false,
      previewLayer: null,
      popOutFeatureTable: false,
      allowNotifications: false
    })
  },
  setProjectExtents (state, {projectId, extents}) {
    state[projectId].extents = extents
  },
  deleteProject (state, { projectId }) {
    Vue.delete(state, projectId)
  },
  setDarkTheme (state, {projectId, enabled}) {
    Vue.set(state[projectId], 'dark', enabled)
  },
  allowNotifications (state, {projectId, allow}) {
    Vue.set(state[projectId], 'allowNotifications', allow)
  },
  resetState (state) {
    Object.keys(state).forEach(key => {
      Vue.delete(state, key)
    })
    Object.assign(state, getDefaultState())
  },
  notifyTab (state, {projectId, tabId}) {
    const notify = Object.assign({}, state[projectId].tabNotification || {})
    notify[tabId] = true
    Vue.set(state[projectId], 'tabNotification', notify)
  },
  clearNotification (state, {projectId, tabId}) {
    const notify = Object.assign({}, state[projectId].tabNotification || {})
    notify[tabId] = false
    Vue.set(state[projectId], 'tabNotification', notify)
  },
  clearNotifications (state, {projectId}) {
    Vue.delete(state[projectId], 'tabNotification')
  },
  setMapZoom (state, {projectId, mapZoom}) {
    Vue.set(state[projectId], 'mapZoom', mapZoom)
  },
  setPreviewLayer (state, {projectId, previewLayer}) {
    Vue.set(state[projectId], 'previewLayer', previewLayer)
  },
  clearPreviewLayer (state, {projectId}) {
    Vue.delete(state[projectId], 'previewLayer')
  },
  popOutFeatureTable (state, {projectId, popOut}) {
    Vue.set(state[projectId], 'featureTablePoppedOut', popOut)
  },
  migrateState (state, {migratedState}) {
    Object.keys(state).forEach(key => {
      Vue.delete(state, key)
    })
    Object.assign(state, migratedState)
  }
}

const actions = {
  addProjectState ({ commit }, id) {
    commit('addProjectState', id)
  },
  setProjectExtents ({ commit }, {projectId, extents}) {
    commit('setProjectExtents', {projectId, extents})
  },
  deleteProject ({ commit }, { projectId }) {
    commit('deleteProject', { projectId })
  },
  setDarkTheme ({ commit }, {projectId, enabled}) {
    commit('setDarkTheme', {projectId, enabled})
  },
  allowNotifications ({ commit }, {projectId, allow}) {
    commit('allowNotifications', {projectId, allow})
  },
  resetState ({ commit }) {
    return commit('resetState')
  },
  notifyTab ({ commit }, {projectId, tabId}) {
    return commit('notifyTab', {projectId, tabId})
  },
  clearNotification ({ commit }, {projectId, tabId}) {
    return commit('clearNotification', {projectId, tabId})
  },
  clearNotifications ({ commit }, {projectId}) {
    return commit('clearNotifications', {projectId})
  },
  setMapZoom ({ commit }, {projectId, mapZoom}) {
    return commit('setMapZoom', {projectId, mapZoom})
  },
  setPreviewLayer ({ commit }, {projectId, previewLayer}) {
    commit('setPreviewLayer', {projectId, previewLayer})
  },
  clearPreviewLayer ({ commit }, {projectId}) {
    commit('clearPreviewLayer', {projectId})
  },
  popOutFeatureTable ({ commit }, {projectId, popOut}) {
    commit('popOutFeatureTable', {projectId, popOut})
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
