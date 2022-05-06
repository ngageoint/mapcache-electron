// Keeps a history of any tile URLs that the user has added, accessible across all projects
import Vue from 'vue'

const getDefaultState = () => {
  return {
    baseMaps: []
  }
}

const state = getDefaultState()

const getters = {
  getBaseMaps: (state) => {
    return state.baseMaps
  }
}

const mutations = {
  addBaseMap (state, baseMap) {
    let exists = false
    for (let i = 0; i < state.baseMaps.length; i++) {
      if (state.baseMaps[i].id === baseMap.id) {
        exists = true
      }
    }
    if (!exists) {
      state.baseMaps.push(baseMap)
    }
  },
  editBaseMap (state, baseMap) {
    for (let i = 0; i < state.baseMaps.length; i++) {
      if (state.baseMaps[i].id === baseMap.id) {
        state.baseMaps.splice(i, 1, baseMap)
      }
    }
  },
  removeBaseMap (state, baseMapId) {
    for (let i = 0; i < state.baseMaps.length; i++) {
      if (state.baseMaps[i].id === baseMapId) {
        state.baseMaps.splice(i, 1)
      }
    }
  },
  resetState (state) {
    Object.keys(state).forEach(key => {
      Vue.delete(state, key)
    })
    Object.assign(state, getDefaultState())
  },
  migrateState (state, { migratedState }) {
    Object.keys(state).forEach(key => {
      Vue.delete(state, key)
    })
    Object.assign(state, migratedState)
  }
}

const actions = {
  addBaseMap ({ commit }, baseMap) {
    commit('addBaseMap', baseMap)
  },
  editBaseMap ({ commit }, baseMap) {
    commit('editBaseMap', baseMap)
  },
  removeBaseMap ({ commit }, baseMapId) {
    commit('removeBaseMap', baseMapId)
  },
  resetState ({ commit }) {
    return commit('resetState')
  },
  migrateState ({ commit }, { migratedState }) {
    commit('migrateState', { migratedState })
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
