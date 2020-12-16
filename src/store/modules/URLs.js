// Keeps a history of any tile URLs that the user has added, accessible across all projects

const state = {
  savedUrls: []
}

const getters = {
  getUrls: (state) => {
    return state.savedUrls
  }
}

const mutations = {
  addUrl (state, urlObject) {
    let exists = false
    for (let i = 0; i < state.savedUrls.length; i++) {
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
  },
  editUrl (state, {oldUrl, newUrl}) {
    for (var i = 0; i < state.savedUrls.length; i++) {
      if (state.savedUrls[i].url === oldUrl) {
        state.savedUrls.splice(i, 1, {url: newUrl})
      }
    }
  }
}

const actions = {
  addUrl ({commit}, url) {
    commit('addUrl', url)
  },
  removeUrl ({commit}, url) {
    commit('removeUrl', url)
  },
  editUrl ({commit}, {oldUrl, newUrl}) {
    commit('editUrl', {oldUrl, newUrl})
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
