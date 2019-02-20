import Vue from 'vue'
import WindowLauncher from '../../lib/window/WindowLauncher'

const newProject = () => {
  let project = {
    id: createId(),
    name: 'New Project',
    layerCount: 0,
    layers: {}
  }

  return project
}

function createId () {
  function s4 () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}

const state = {
}

const getters = {
  getProjectById: (state) => (id) => {
    return state[id]
  },
  getNewProject: (state) => () => {
    return newProject()
  }
}

const mutations = {
  pushProjectToProjects (state, project) {
    Vue.set(state, project.id, project)
  },
  setProjectName (state, {project, name}) {
    state[project.id].name = name
  },
  deleteProject (state, project) {
    Vue.delete(state, project.id)
  }
}

const actions = {
  newProject ({ commit, state }) {
    let project = newProject()
    commit('pushProjectToProjects', project)
    actions.openProject({ commit, state }, project)
  },
  setProjectName ({ commit, state }, {project, name}) {
    commit('setProjectName', {project, name})
  },
  deleteProject ({ commit, state }, project) {
    commit('deleteProject', project)
  },
  openProject ({ commit, state }, project) {
    WindowLauncher.launchProjectWindow(project.id)
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
