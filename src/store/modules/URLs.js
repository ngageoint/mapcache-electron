// Keeps a history of any tile URLs that the user has added, accessible across all projects
import { environment } from '../../lib/env/env'

const getDefaultState = () => {
  return {
    savedUrls: [],
    nominatimUrl: environment.nominatimUrl,
    overpassUrl: environment.overpassUrl
  }
}

const state = getDefaultState()

const getters = {
  getUrls: (state) => {
    return state.savedUrls
  },
}

const mutations = {
  addUrl (state, url) {
    console.log(url)
    let exists = false
    for (let i = 0; i < state.savedUrls.length; i++) {
      if (state.savedUrls[i].url.toLowerCase() === url.toLowerCase()) {
        exists = true
      }
    }
    if (!exists) {
      state.savedUrls.push({ url: url })
    }
  },
  removeUrl (state, url) {
    for (let i = 0; i < state.savedUrls.length; i++) {
      if (state.savedUrls[i].url === url) {
        state.savedUrls.splice(i, 1)
      }
    }
  },
  editUrl (state, { oldUrl, newUrl }) {
    for (let i = 0; i < state.savedUrls.length; i++) {
      if (state.savedUrls[i].url === oldUrl) {
        state.savedUrls.splice(i, 1, { url: newUrl })
      }
    }
  },
  setNominatimUrl (state, url) {
    state.nominatimUrl = url
  },
  setOverpassUrl (state, url) {
    state.overpassUrl = url
  },
  resetState (state) {
    Object.keys(state).forEach(key => {
      delete state[key]
    })
    Object.assign(state, getDefaultState())
  },
  migrateState (state, { migratedState }) {
    Object.keys(state).forEach(key => {
      delete state[key]
    })
    Object.assign(state, migratedState)
  }
}

const actions = {
  addUrl ({ commit }, url) {
    commit('addUrl', url)
  },
  removeUrl ({ commit }, url) {
    commit('removeUrl', url)
  },
  editUrl ({ commit }, { oldUrl, newUrl }) {
    commit('editUrl', { oldUrl, newUrl })
  },
  resetState ({ commit }) {
    return commit('resetState')
  },
  migrateState ({ commit }, { migratedState }) {
    commit('migrateState', { migratedState })
  },
  setNominatimUrl ({ commit }, url) {
    commit('setNominatimUrl', url)
  },
  setOverpassUrl ({ commit }, url) {
    commit('setOverpassUrl', url)
  },
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
