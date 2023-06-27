const state = {
  version: '-1'
}

const getters = {
  getVersion: (state) => {
    return state.version
  }
}

const mutations = {
  setVersion (state, version) {
    state.version = version
  }
}

const actions = {
  setVersion ({ commit }, version) {
    commit('setVersion', version)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
