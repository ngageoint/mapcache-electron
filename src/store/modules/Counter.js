import Vue from 'vue'

const getDefaultState = () => {
  return {
    main: 0
  }
}

const state = getDefaultState()

const mutations = {
  DECREMENT_MAIN_COUNTER (state) {
    state.main--
  },
  INCREMENT_MAIN_COUNTER (state) {
    state.main++
  },
  resetState (state) {
    Object.keys(state).forEach(key => {
      Vue.delete(state, key)
    })
    Object.assign(state, getDefaultState())
  }
}

const actions = {
  someAsyncTask ({ commit }) {
    // do something async
    commit('INCREMENT_MAIN_COUNTER')
  },
  resetState ({ commit }) {
    return commit('resetState')
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
