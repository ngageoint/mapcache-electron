// const state = {
//   id: undefined,
//   name: undefined,
//   layers: {},
//   layerCount: 0
// }

const getters = {
}

const mutations = {
  setName (state, {name}) {
    state.name = name
  }
}

const actions = {
  setName ({ commit, state }, {name}) {
    commit('setName', {name})
  }
}

export default {
  namespaced: true,
  state () {
    return {
      id: undefined,
      name: undefined,
      layers: {},
      layerCount: 0
    }
  },
  mutations,
  actions,
  getters
}
