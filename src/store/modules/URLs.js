// Keeps a history of any tile URLs that the user has added, accessible across all projects

const state = {
}

const getters = {
  getUrls: (state) => {
    return state.savedUrls
  }
}

const mutations = {
  addUrl (state, urlObject) {
    let exists = false
    for (var i = 0; i < state.savedUrls.length; i++) {
      if (state.savedUrls[i].url === urlObject.url) {
        exists = true
      }
    }
    if (!exists) {
      state.savedUrls.push(urlObject)
    }
  },
  removeUrl (state, url) {
    for (var i = 0; i < state.savedUrls.length; i++) {
      if (state.savedUrls[i].url === url) {
        state.savedUrls.splice(i, 1)
      }
    }
  }
}

const actions = {
  addUrl ({commit, state}, url) {
    commit('addUrl', url)
  },
  removeUrl ({commit, state}, url) {
    commit('removeUrl', url)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
