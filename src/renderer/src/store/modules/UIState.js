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
  addProjectState (state, { projectId }) {
    state[projectId] = {
      extents: [-53.4, -79.1, 53.64, 79.1],
      drawBounds: {},
      boundsBeingDrawn: {},
      activeCount: 0,
      dark: false,
      popOutFeatureTable: false,
      allowNotifications: false
    }
  },
  setProjectExtents (state, { projectId, extents }) {
    state[projectId].extents = extents
  },
  deleteProject (state, { projectId }) {
    delete state[projectId]
  },
  setDarkTheme (state, { projectId, enabled }) {
    state[projectId].dark = enabled
  },
  allowNotifications (state, { projectId, allow }) {
    state[projectId].allowNotifications = allow
  },
  resetState (state) {
    Object.keys(state).forEach(key => {
      delete state[key]
    })
    Object.assign(state, getDefaultState())
  },
  notifyTab (state, { projectId, tabId }) {
    const notify = Object.assign({}, state[projectId].tabNotification || {})
    notify[tabId] = true
    state[projectId].tabNotification = notify
  },
  clearNotification (state, { projectId, tabId }) {
    const notify = Object.assign({}, state[projectId].tabNotification || {})
    notify[tabId] = false
    state[projectId].tabNotification = notify
  },
  clearNotifications (state, { projectId }) {
    delete state[projectId].tabNotification
  },
  setMapZoom (state, { projectId, mapZoom }) {
    state[projectId].mapZoom = mapZoom
  },
  popOutFeatureTable (state, { projectId, popOut }) {
    state[projectId].featureTablePoppedOut = popOut
  },
  migrateState (state, { migratedState }) {
    Object.keys(state).forEach(key => {
      delete state[key]
    })
    Object.assign(state, migratedState)
  }
}

const actions = {
  addProjectState ({ commit }, id) {
    commit('addProjectState', id)
  },
  setProjectExtents ({ commit }, { projectId, extents }) {
    commit('setProjectExtents', { projectId, extents })
  },
  deleteProject ({ commit }, { projectId }) {
    commit('deleteProject', { projectId })
  },
  setDarkTheme ({ commit }, { projectId, enabled }) {
    commit('setDarkTheme', { projectId, enabled })
  },
  allowNotifications ({ commit }, { projectId, allow }) {
    commit('allowNotifications', { projectId, allow })
  },
  resetState ({ commit }) {
    return commit('resetState')
  },
  notifyTab ({ commit }, { projectId, tabId }) {
    return commit('notifyTab', { projectId, tabId })
  },
  clearNotification ({ commit }, { projectId, tabId }) {
    return commit('clearNotification', { projectId, tabId })
  },
  clearNotifications ({ commit }, { projectId }) {
    return commit('clearNotifications', { projectId })
  },
  setMapZoom ({ commit }, { projectId, mapZoom }) {
    return commit('setMapZoom', { projectId, mapZoom })
  },
  popOutFeatureTable ({ commit }, { projectId, popOut }) {
    commit('popOutFeatureTable', { projectId, popOut })
  },
  migrateState ({ commit }, { migratedState }) {
    commit('migrateState', { migratedState })
  }
}

const modules = {}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
  modules
}
