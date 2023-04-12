const getDefaultState = () => {
  return {}
}
const state = getDefaultState()

const getters = {
  getProjectById: (state) => (id) => {
    return state[id]
  }
}

const mutations = {
  pushProjectToProjects (state, project) {
    state[project.id] = project
  },
  setProjectName (state, { projectId, name }) {
    if (state[projectId]) {
      state[projectId].name = name
    }
  },
  setProjectAccessed (state, { projectId }) {
    if (state[projectId]) {
      state[projectId].lastAccessedDateTime = new Date().getTime()
    }
  },
  setDataSourceDisplayName (state, { projectId, sourceId, displayName }) {
    if (state[projectId]) {
      state[projectId].sources[sourceId].displayName = displayName
    }
  },
  addDataSources (state, { projectId, dataSources }) {
    if (state[projectId]) {
      dataSources.forEach(source => {
        state[projectId].sources[source.id] = source.config
      })
    }
  },
  setGeoPackage (state, { projectId, geopackage }) {
    if (state[projectId]) {
      state[projectId].geopackages[geopackage.id] = geopackage
    }
  },
  setDataSource (state, { projectId, source }) {
    if (state[projectId]) {
      state[projectId].sources[source.id] = source
    }
  },
  setProjectMaxFeatures (state, { projectId, maxFeatures }) {
    if (state[projectId]) {
      state[projectId].maxFeatures = maxFeatures
    }
  },
  setDataSourceVisible (state, { projectId, sourceId, visible }) {
    if (state[projectId]) {
      state[projectId].sources[sourceId].visible = visible
    }
  },
  removeDataSource (state, { projectId, sourceId }) {
    if (state[projectId]) {
      delete state[projectId].sources[sourceId]
    }
  },
  deleteProject (state, { projectId }) {
    delete state[projectId]
  },
  removeGeoPackage (state, { projectId, geopackageId }) {
    if (state[projectId]) {
      delete state[projectId].geopackages[geopackageId]
    }
  },
  setZoomControlEnabled (state, { projectId, enabled }) {
    if (state[projectId]) {
      state[projectId].zoomControlEnabled = enabled
    }
  },
  setDisplayZoomEnabled (state, { projectId, enabled }) {
    if (state[projectId]) {
      state[projectId].displayZoomEnabled = enabled
    }
  },
  setDisplayAddressSearchBar (state, { projectId, enabled }) {
    if (state[projectId]) {
      state[projectId].displayAddressSearchBar = enabled
    }
  },
  setDisplayCoordinates (state, { projectId, enabled }) {
    if (state[projectId]) {
      state[projectId].displayCoordinates = enabled
    }
  },
  setDisplayScale (state, { projectId, enabled }) {
    if (state[projectId]) {
      state[projectId].displayScale = enabled
    }
  },
  clearActiveLayers (state, { projectId }) {
    if (state[projectId]) {
      const projectCopy = Object.assign({}, state[projectId])
      Object.keys(projectCopy.geopackages).forEach(key => {
        const geopackage = projectCopy.geopackages[key]
        Object.keys(geopackage.tables.tiles).forEach(table => {
          geopackage.tables.tiles[table].visible = false
        })
        Object.keys(geopackage.tables.features).forEach(table => {
          geopackage.tables.features[table].visible = false
        })
      })
      Object.keys(projectCopy.sources).forEach(key => {
        const source = projectCopy.sources[key]
        source.visible = false
      })
      state[projectId] = projectCopy
    }
  },
  showToolTips (state, { projectId, show }) {
    if (state[projectId]) {
      state[projectId].showToolTips = show
    }
  },
  setMapProjection (state, { projectId, mapProjection }) {
    if (state[projectId]) {
      state[projectId].mapProjection = mapProjection
    }
  },
  setActiveGeoPackage (state, { projectId, geopackageId }) {
    if (state[projectId]) {
      state[projectId].activeGeoPackage = {
        geopackageId: geopackageId,
        tableName: undefined,
        showFeaturesTableEvent: 0
      }
    }
  },
  setActiveGeoPackageFeatureLayer (state, { projectId, geopackageId, tableName }) {
    if (state[projectId]) {
      state[projectId].activeGeoPackage = {
        geopackageId: geopackageId,
        tableName: tableName,
        showFeaturesTableEvent: 0
      }
    }
  },
  resetState (state) {
    Object.keys(state).forEach(key => {
      delete state[key]
    })
    Object.assign(state, getDefaultState())
  },
  setMapRenderingOrder (state, { projectId, mapRenderingOrder }) {
    if (state[projectId]) {
      state[projectId].mapRenderingOrder = mapRenderingOrder
    }
  },
  migrateState (state, { migratedState }) {
    Object.keys(state).forEach(key => {
      delete state[key]
    })
    Object.assign(state, migratedState)
  }
}

const actions = {
  async newProject ({ commit }, { id, name, directory, sources = {} }) {
    return new Promise(resolve => {
      let project = {
        id: id,
        name: name || 'New Project',
        directory: directory,
        sources: sources,
        geopackages: {},
        zoomControlEnabled: true,
        displayZoomEnabled: true,
        displayCoordinates: true,
        displayScale: true,
        maxFeatures: 1000,
        showToolTips: true,
        displayAddressSearchBar: true,
        activeGeoPackage: {
          geopackageId: undefined,
          tableName: undefined
        },
        lastAccessedDateTime: new Date().getTime()
      }
      commit('pushProjectToProjects', project)
      resolve(project.id)
    })
  },
  setProjectAccessed ({ commit }, { projectId }) {
    commit('setProjectAccessed', { projectId })
  },
  setProjectName ({ commit }, { projectId, name }) {
    commit('setProjectName', { projectId, name })
  },
  showToolTips ({ commit }, { projectId, show }) {
    commit('showToolTips', { projectId, show })
  },
  setMapProjection ({ commit }, { projectId, mapProjection }) {
    commit('setMapProjection', { projectId, mapProjection })
  },
  setDataSourceDisplayName ({ commit }, { projectId, sourceId, displayName }) {
    commit('setDataSourceDisplayName', { projectId, sourceId, displayName })
  },
  addDataSources ({ commit }, { projectId, dataSources }) {
    commit('addDataSources', { projectId, dataSources })
  },
  removeGeoPackage ({ commit }, { projectId, geopackageId }) {
    commit('removeGeoPackage', { projectId, geopackageId })
  },
  setDataSourceVisible ({ commit }, { projectId, sourceId, visible }) {
    commit('setDataSourceVisible', { projectId, sourceId, visible })
  },
  removeDataSource ({ commit }, { projectId, sourceId }) {
    commit('removeDataSource', { projectId, sourceId })
  },
  removeFeatureFromDataSource ({ commit }, { projectId, source }) {
    commit('setDataSource', { projectId, source: source })
  },
  deleteProject ({ commit }, { projectId }) {
    commit('deleteProject', { projectId })
  },
  setProjectMaxFeatures ({ commit }, { projectId, maxFeatures }) {
    commit('setProjectMaxFeatures', { projectId, maxFeatures })
  },
  setZoomControlEnabled ({ commit }, { projectId, enabled }) {
    commit('setZoomControlEnabled', { projectId, enabled })
  },
  setDisplayZoomEnabled ({ commit }, { projectId, enabled }) {
    commit('setDisplayZoomEnabled', { projectId, enabled })
  },
  setDisplayAddressSearchBar ({ commit }, { projectId, enabled }) {
    commit('setDisplayAddressSearchBar', { projectId, enabled })
  },
  setDisplayCoordinates ({ commit }, { projectId, enabled }) {
    commit('setDisplayCoordinates', { projectId, enabled })
  },
  setDisplayScale ({ commit }, { projectId, enabled }) {
    commit('setDisplayScale', { projectId, enabled })
  },
  clearActiveLayers ({ commit }, { projectId }) {
    commit('clearActiveLayers', { projectId })
  },
  setActiveGeoPackage ({ commit }, { projectId, geopackageId }) {
    commit('setActiveGeoPackage', { projectId, geopackageId })
  },
  setActiveGeoPackageFeatureLayer ({ commit }, { projectId, geopackageId, tableName }) {
    commit('setActiveGeoPackageFeatureLayer', { projectId, geopackageId, tableName })
  },
  async setGeoPackage ({ commit }, { projectId, geopackage }) {
    return new Promise(resolve => {
      commit('setGeoPackage', { projectId, geopackage })
      resolve()
    })
  },
  setDataSource ({ commit }, { projectId, source }) {
    commit('setDataSource', { projectId, source })
  },
  resetState ({ commit }) {
    return commit('resetState')
  },
  setMapRenderingOrder ({ commit }, { projectId, mapRenderingOrder }) {
    commit('setMapRenderingOrder', { projectId, mapRenderingOrder })
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
