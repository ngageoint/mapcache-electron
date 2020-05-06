import Vue from 'vue'
import WindowLauncher from '../../lib/window/WindowLauncher'
import GeoPackageUtilities from '../../lib/GeoPackageUtilities'
import UniqueIDUtilities from '../../lib/UniqueIDUtilities'

const state = {
}

const getters = {
  getProjectById: (state) => (id) => {
    return state[id]
  }
}

const mutations = {
  pushProjectToProjects (state, project) {
    Vue.set(state, project.id, project)
  },
  setProjectName (state, {project, name}) {
    state[project.id].name = name
  },
  setLayerDisplayName (state, {projectId, layerId, displayName}) {
    // if (!_.isNil(state[projectId].geopackages)) {
    //   let keys = Object.keys(state[projectId].geopackages)
    //   for (let i = 0; i < keys.length; i++) {
    //     let geopackageId = keys[i]
    //     let geopackage = _.cloneDeep(state[projectId].geopackages[geopackageId])
    //     let update = false
    //     if (!_.isNil(geopackage.imageryLayers[layerId])) {
    //       geopackage.imageryLayers[layerId].displayName = displayName
    //       update = true
    //     }
    //     if (!_.isNil(geopackage.featureLayers[layerId])) {
    //       geopackage.featureLayers[layerId].displayName = displayName
    //       update = true
    //     }
    //     if (!_.isNil(geopackage.featureToImageryLayers[layerId])) {
    //       geopackage.featureToImageryLayers[layerId].displayName = displayName
    //       update = true
    //     }
    //     if (update) {
    //       Vue.set(state[projectId].geopackages, geopackageId, geopackage)
    //     }
    //   }
    // }
    Vue.set(state[projectId].layers[layerId], 'displayName', displayName)
  },
  addProjectLayer (state, {project, layerId, config}) {
    Vue.set(state[project.id].layers, layerId, config)
  },
  addProjectLayers (state, {projectLayers}) {
    projectLayers.forEach(layer => {
      Vue.set(state[layer.project.id].layers, layer.layerId, layer.config)
    })
  },
  addGeoPackage (state, {project, geopackage}) {
    if (!state[project.id].geopackages[geopackage.id]) {
      Vue.set(state[project.id].geopackages, geopackage.id, geopackage)
    }
  },
  setGeoPackageBuildMode (state, {projectId, geopackageId, buildMode}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'buildMode', buildMode)
  },
  setGeoPackageStatusReset (state, {projectId, geopackageId}) {
    Vue.delete(state[projectId].geopackages[geopackageId], 'status')
    Vue.delete(state[projectId].geopackages[geopackageId], 'buildMode')
  },
  addGeoPackageTileConfiguration (state, {projectId, geopackageId, tileConfiguration}) {
    Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations, tileConfiguration.id, tileConfiguration)
  },
  setGeoPackageTileTableName (state, {projectId, geopackageId, configId, tableName}) {
    Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'tableName', tableName)
  },
  setGeoPackageTileConfigurationName (state, {projectId, geopackageId, configId, configurationName}) {
    Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'configurationName', configurationName)
  },
  setGeoPackageTileConfigurationTileLayers (state, {projectId, geopackageId, configId, tileLayers}) {
    Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'tileLayers', tileLayers)
  },
  setGeoPackageTileConfigurationVectorLayers (state, {projectId, geopackageId, configId, vectorLayers}) {
    Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'vectorLayers', vectorLayers)
  },
  setGeoPackageTileConfigurationBoundingBox (state, {projectId, geopackageId, configId, boundingBox}) {
    Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'boundingBox', boundingBox)
  },
  setGeoPackageTileConfigurationRenderingOrder (state, {projectId, geopackageId, configId, renderingOrder}) {
    Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'renderingOrder', renderingOrder)
  },
  toggleGeoPackageTileConfigurationBoundingBoxEditing (state, {projectId, geopackageId, configId, enabled}) {
    Object.values(state[projectId].geopackages).forEach(gp => {
      Object.values(gp.tileConfigurations).forEach(vc => {
        if (vc.boundingBoxEditingEnabled) {
          Vue.set(state[projectId].geopackages[gp.id].tileConfigurations[vc.id], 'boundingBoxEditingEnabled', false)
        }
      })
      Object.values(gp.vectorConfigurations).forEach(tc => {
        if (tc.boundingBoxEditingEnabled) {
          Vue.set(state[projectId].geopackages[gp.id].vectorConfigurations[tc.id], 'boundingBoxEditingEnabled', false)
        }
      })
    })
    Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'boundingBoxEditingEnabled', enabled)
  },
  setGeoPackageTileConfigurationTileScaling (state, {projectId, geopackageId, configId, tileScaling}) {
    Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'tileScaling', tileScaling)
  },
  setGeoPackageTileConfigurationMinZoom (state, {projectId, geopackageId, configId, minZoom}) {
    if (minZoom < 0) {
      minZoom = 0
    }
    if (minZoom > 20) {
      minZoom = 20
    }
    if (minZoom > state[projectId].geopackages[geopackageId].tileConfigurations[configId].maxZoom) {
      Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'maxZoom', minZoom)
    }
    Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'minZoom', minZoom)
  },
  setGeoPackageTileConfigurationMaxZoom (state, {projectId, geopackageId, configId, maxZoom}) {
    if (maxZoom < 0) {
      maxZoom = 0
    }
    if (maxZoom > 20) {
      maxZoom = 20
    }
    if (maxZoom < state[projectId].geopackages[geopackageId].tileConfigurations[configId].minZoom) {
      Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'minZoom', maxZoom)
    }
    Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'maxZoom', maxZoom)
  },
  deleteGeoPackageTileConfiguration (state, {projectId, geopackageId, configId}) {
    Vue.delete(state[projectId].geopackages[geopackageId].tileConfigurations, configId)
  },
  addGeoPackageVectorConfiguration (state, {projectId, geopackageId, vectorConfiguration}) {
    Vue.set(state[projectId].geopackages[geopackageId].vectorConfigurations, vectorConfiguration.id, vectorConfiguration)
  },
  setGeoPackageVectorConfigurationName (state, {projectId, geopackageId, configId, configurationName}) {
    Vue.set(state[projectId].geopackages[geopackageId].vectorConfigurations[configId], 'configurationName', configurationName)
  },
  setGeoPackageVectorConfigurationVectorLayers (state, {projectId, geopackageId, configId, vectorLayers}) {
    Vue.set(state[projectId].geopackages[geopackageId].vectorConfigurations[configId], 'vectorLayers', vectorLayers)
  },
  setGeoPackageVectorConfigurationBoundingBox (state, {projectId, geopackageId, configId, boundingBox}) {
    Vue.set(state[projectId].geopackages[geopackageId].vectorConfigurations[configId], 'boundingBox', boundingBox)
  },
  toggleGeoPackageVectorConfigurationBoundingBoxEditing (state, {projectId, geopackageId, configId, enabled}) {
    // when enabling bounding box editing for a configuration, we will need to first disable boundingBoxEditingEnabled for other configurations
    Object.values(state[projectId].geopackages).forEach(gp => {
      Object.values(gp.vectorConfigurations).forEach(vc => {
        if (vc.boundingBoxEditingEnabled) {
          Vue.set(state[projectId].geopackages[gp.id].vectorConfigurations[vc.id], 'boundingBoxEditingEnabled', false)
        }
      })
      Object.values(gp.tileConfigurations).forEach(tc => {
        if (tc.boundingBoxEditingEnabled) {
          Vue.set(state[projectId].geopackages[gp.id].tileConfigurations[tc.id], 'boundingBoxEditingEnabled', false)
        }
      })
    })
    Vue.set(state[projectId].geopackages[geopackageId].vectorConfigurations[configId], 'boundingBoxEditingEnabled', enabled)
  },
  deleteGeoPackageVectorConfiguration (state, {projectId, geopackageId, configId}) {
    Vue.delete(state[projectId].geopackages[geopackageId].vectorConfigurations, configId)
  },
  toggleProjectLayer (state, {projectId, layerId}) {
    Vue.set(state[projectId].layers[layerId], 'shown', !state[projectId].layers[layerId].shown)
  },
  expandProjectLayer (state, {projectId, layerId}) {
    Vue.set(state[projectId].layers[layerId], 'expanded', !state[projectId].layers[layerId].expanded)
  },
  expandGeoPackageConfiguration (state, {projectId, geopackageId}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'expanded', !state[projectId].geopackages[geopackageId].expanded)
  },
  setGeoPackageName (state, {projectId, geopackageId, name}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'name', name)
  },
  setGeoPackageLocation (state, { projectId, geopackageId, fileName }) {
    Vue.set(state[projectId].geopackages[geopackageId], 'fileName', fileName)
  },
  setGeoPackageStatus (state, {projectId, geopackageId, status}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'status', status)
  },
  removeProjectLayer (state, {projectId, layerId}) {
    Vue.delete(state[projectId].layers, layerId)
  },
  updateProjectLayer (state, {projectId, layer}) {
    Vue.set(state[projectId].layers, layer.id, layer)
  },
  updateProjectLayerStyle (state, {projectId, layerId, style}) {
    Vue.set(state[projectId].layers[layerId], 'style', style)
  },
  updateProjectLayerStyleMaxFeatures (state, {projectId, layerId, maxFeatures}) {
    Vue.set(state[projectId].layers[layerId], 'maxFeatures', maxFeatures)
  },
  updateProjectLayerUsePointIconDefault (state, {projectId, layerId}) {
    Vue.set(state[projectId].layers[layerId], 'layerKey', state[projectId].layers[layerId].layerKey + 1)
  },
  updateLayerKey (state, {projectId, layerId}) {
    Vue.set(state[projectId].layers[layerId], 'layerKey', state[projectId].layers[layerId].layerKey + 1)
  },
  updateLayerFeatureCount (state, {projectId, layerId, count}) {
    Vue.set(state[projectId].layers[layerId], 'count', count)
  },
  updateLayerExtent (state, {projectId, layerId, extent}) {
    Vue.set(state[projectId].layers[layerId], 'extent', extent)
  },
  updateStyleAssignmentFeature (state, {projectId, layerId, styleAssignmentFeature}) {
    Vue.set(state[projectId].layers[layerId], 'styleAssignmentFeature', styleAssignmentFeature)
  },
  updateIconAssignmentFeature (state, {projectId, layerId, iconAssignmentFeature}) {
    Vue.set(state[projectId].layers[layerId], 'iconAssignmentFeature', iconAssignmentFeature)
  },
  deleteProject (state, project) {
    Vue.delete(state, project.id)
  },
  deleteGeoPackage (state, {projectId, geopackageId}) {
    Vue.delete(state[projectId].geopackages, geopackageId)
  }
}

const actions = {
  newProject ({ dispatch, commit, state }) {
    let project = {
      id: UniqueIDUtilities.createUniqueID(),
      name: 'New Project',
      layerCount: 0,
      layers: {},
      geopackages: {}
    }
    commit('UIState/addProjectState', {projectId: project.id}, { root: true })
    commit('pushProjectToProjects', project)
    actions.openProject({ commit, state }, project)
  },
  setProjectName ({ commit, state }, {project, name}) {
    commit('setProjectName', {project, name})
  },
  setLayerDisplayName ({ commit, state }, {projectId, layerId, displayName}) {
    commit('setLayerDisplayName', {projectId, layerId, displayName})
  },
  addProjectLayer ({ commit, state }, {project, layerId, config}) {
    commit('addProjectLayer', {project, layerId, config})
  },
  addProjectLayers ({ commit, state }, {projectLayers}) {
    commit('addProjectLayers', {projectLayers})
  },
  addGeoPackage ({ commit, state }, {project}) {
    let name = project.name + ' GeoPackage Configuration'
    if (Object.keys(project.geopackages).length) {
      name += ' ' + Object.keys(project.geopackages).length
    }
    let tileLayers = {}
    let vectorLayers = {}
    for (const layerId in project.layers) {
      let layer = project.layers[layerId]
      if (layer.pane === 'tile' && !tileLayers[layerId]) {
        tileLayers[layerId] = {
          id: layer.id,
          included: layer.shown,
          name: layer.name,
          displayName: layer.displayName || layer.name,
          style: layer.style
        }
      }
      if (layer.pane === 'vector' && !vectorLayers[layerId]) {
        vectorLayers[layerId] = {
          id: layer.id,
          included: layer.shown,
          name: layer.name,
          displayName: layer.displayName || layer.name,
          style: layer.style,
          geopackageFilePath: layer.geopackageFilePath,
          sourceLayerName: layer.sourceLayerName
        }
      }
    }

    let geopackage = {
      id: UniqueIDUtilities.createUniqueID(),
      name: name,
      expanded: true,
      vectorConfigurations: {},
      tileConfigurations: {},
      layers: Object.keys(project.layers),
      tileLayers: tileLayers,
      vectorLayers: vectorLayers
    }
    commit('addGeoPackage', {project, geopackage})
  },
  addGeoPackageTileConfiguration ({ commit, state }, {projectId, geopackageId}) {
    let count = 1
    let tableName = 'TileTable' + count
    while (Object.values(state[projectId].geopackages[geopackageId].tileConfigurations).findIndex(config => config.tableName === tableName) !== -1) {
      count++
      tableName = 'TileTable' + count
    }
    count = 1
    let configName = 'Tile Configuration ' + count
    while (Object.values(state[projectId].geopackages[geopackageId].tileConfigurations).findIndex(config => config.configurationName === configName) !== -1) {
      count++
      configName = 'Tile Configuration ' + count
    }
    let tileConfiguration = {
      id: UniqueIDUtilities.createUniqueID(),
      type: 'tile',
      configurationName: configName,
      tableName: tableName,
      tileLayers: [],
      vectorLayers: [],
      renderingOrder: [],
      minZoom: 0,
      maxZoom: 0,
      tileScaling: false,
      boundingBox: undefined,
      boundingBoxEditingEnabled: false
    }
    commit('addGeoPackageTileConfiguration', {projectId, geopackageId, tileConfiguration})
  },
  setGeoPackageTileConfigurationName ({ commit, state }, {projectId, geopackageId, configId, configurationName}) {
    commit('setGeoPackageTileConfigurationName', {projectId, geopackageId, configId, configurationName})
  },
  setGeoPackageTileTableName ({ commit, state }, {projectId, geopackageId, configId, tableName}) {
    commit('setGeoPackageTileTableName', {projectId, geopackageId, configId, tableName})
  },
  setGeoPackageTileConfigurationTileLayers ({ commit, state }, {projectId, geopackageId, configId, tileLayers}) {
    commit('setGeoPackageTileConfigurationTileLayers', {projectId, geopackageId, configId, tileLayers})
  },
  setGeoPackageTileConfigurationVectorLayers ({ commit, state }, {projectId, geopackageId, configId, vectorLayers}) {
    commit('setGeoPackageTileConfigurationVectorLayers', {projectId, geopackageId, configId, vectorLayers})
  },
  setGeoPackageTileConfigurationBoundingBox ({ commit, state }, {projectId, geopackageId, configId, boundingBox}) {
    commit('setGeoPackageTileConfigurationBoundingBox', {projectId, geopackageId, configId, boundingBox})
  },
  setGeoPackageTileConfigurationRenderingOrder ({ commit, state }, {projectId, geopackageId, configId, renderingOrder}) {
    commit('setGeoPackageTileConfigurationRenderingOrder', {projectId, geopackageId, configId, renderingOrder})
  },
  setGeoPackageTileConfigurationTileScaling ({ commit, state }, {projectId, geopackageId, configId, tileScaling}) {
    commit('setGeoPackageTileConfigurationTileScaling', {projectId, geopackageId, configId, tileScaling})
  },
  setGeoPackageTileConfigurationMinZoom ({ commit, state }, {projectId, geopackageId, configId, minZoom}) {
    commit('setGeoPackageTileConfigurationMinZoom', {projectId, geopackageId, configId, minZoom})
  },
  setGeoPackageTileConfigurationMaxZoom ({ commit, state }, {projectId, geopackageId, configId, maxZoom}) {
    commit('setGeoPackageTileConfigurationMaxZoom', {projectId, geopackageId, configId, maxZoom})
  },
  toggleGeoPackageTileConfigurationBoundingBoxEditing ({ commit, state }, {projectId, geopackageId, configId, enabled}) {
    commit('toggleGeoPackageTileConfigurationBoundingBoxEditing', {projectId, geopackageId, configId, enabled})
  },
  deleteGeoPackageTileConfiguration ({ commit, state }, {projectId, geopackageId, configId}) {
    commit('deleteGeoPackageTileConfiguration', {projectId, geopackageId, configId})
  },
  addGeoPackageVectorConfiguration ({ commit, state }, {projectId, geopackageId}) {
    let count = 1
    let configName = 'Vector Configuration #' + count
    while (Object.values(state[projectId].geopackages[geopackageId].vectorConfigurations).findIndex(config => config.configurationName === configName) !== -1) {
      count++
      configName = 'Vector Configuration #' + count
    }
    let vectorConfiguration = {
      id: UniqueIDUtilities.createUniqueID(),
      type: 'vector',
      configurationName: configName,
      vectorLayers: [],
      boundingBox: undefined,
      boundingBoxEditingEnabled: false,
      indexed: true
    }
    commit('addGeoPackageVectorConfiguration', {projectId, geopackageId, vectorConfiguration})
  },
  setGeoPackageVectorConfigurationName ({ commit, state }, {projectId, geopackageId, configId, configurationName}) {
    commit('setGeoPackageVectorConfigurationName', {projectId, geopackageId, configId, configurationName})
  },
  setGeoPackageVectorConfigurationVectorLayers ({ commit, state }, {projectId, geopackageId, configId, vectorLayers}) {
    commit('setGeoPackageVectorConfigurationVectorLayers', {projectId, geopackageId, configId, vectorLayers})
  },
  setGeoPackageVectorConfigurationBoundingBox ({ commit, state }, {projectId, geopackageId, configId, boundingBox}) {
    commit('setGeoPackageVectorConfigurationBoundingBox', {projectId, geopackageId, configId, boundingBox})
  },
  toggleGeoPackageVectorConfigurationBoundingBoxEditing ({ commit, state }, {projectId, geopackageId, configId, enabled}) {
    commit('toggleGeoPackageVectorConfigurationBoundingBoxEditing', {projectId, geopackageId, configId, enabled})
  },
  deleteGeoPackageVectorConfiguration ({ commit, state }, {projectId, geopackageId, configId}) {
    commit('deleteGeoPackageVectorConfiguration', {projectId, geopackageId, configId})
  },
  toggleProjectLayer ({ commit, state }, {projectId, layerId}) {
    commit('toggleProjectLayer', {projectId, layerId})
  },
  expandProjectLayer ({ commit, state }, {projectId, layerId}) {
    commit('expandProjectLayer', {projectId, layerId})
  },
  expandGeoPackageConfiguration ({ commit, state }, {projectId, geopackageId}) {
    commit('expandGeoPackageConfiguration', {projectId, geopackageId})
  },
  removeProjectLayer ({ commit, state }, {projectId, layerId}) {
    commit('removeProjectLayer', {projectId, layerId})
  },
  updateStyleAssignmentFeature ({ commit, state }, {projectId, layerId, styleAssignmentFeature}) {
    commit('updateStyleAssignmentFeature', {projectId, layerId, styleAssignmentFeature})
  },
  updateIconAssignmentFeature ({ commit, state }, {projectId, layerId, iconAssignmentFeature}) {
    commit('updateIconAssignmentFeature', {projectId, layerId, iconAssignmentFeature})
  },
  updateFeatureStyleSelection ({ commit, state }, {projectId, layerId, featureId, styleId}) {
    let layerConfiguration = state[projectId].layers[layerId]
    GeoPackageUtilities.setFeatureStyle(layerConfiguration.geopackageFilePath, layerConfiguration.sourceLayerName, featureId, styleId).then(function () {
      commit('updateLayerKey', {projectId, layerId})
    })
  },
  updateFeatureIconSelection ({ commit, state }, {projectId, layerId, featureId, iconId}) {
    let layerConfiguration = state[projectId].layers[layerId]
    GeoPackageUtilities.setFeatureIcon(layerConfiguration.geopackageFilePath, layerConfiguration.sourceLayerName, featureId, iconId).then(function () {
      commit('updateLayerKey', {projectId, layerId})
    })
  },
  createProjectLayerStyleRow ({ commit, state }, {projectId, layerId}) {
    let layerConfiguration = state[projectId].layers[layerId]
    GeoPackageUtilities.createStyleRow(layerConfiguration.geopackageFilePath, layerConfiguration.sourceLayerName).then(function () {
      commit('updateLayerKey', {projectId, layerId})
    })
  },
  createProjectLayerIconRow ({ commit, state }, {projectId, layerId}) {
    let layerConfiguration = state[projectId].layers[layerId]
    GeoPackageUtilities.createIconRow(layerConfiguration.geopackageFilePath, layerConfiguration.sourceLayerName).then(function () {
      commit('updateLayerKey', {projectId, layerId})
    })
  },
  updateProjectLayerStyleRow ({ commit, state }, {projectId, layerId, styleRow}) {
    let layerConfiguration = state[projectId].layers[layerId]
    GeoPackageUtilities.updateStyleRow(layerConfiguration.geopackageFilePath, layerConfiguration.sourceLayerName, styleRow).then(function () {
      commit('updateLayerKey', {projectId, layerId})
    })
  },
  updateProjectLayerIconRow ({ commit, state }, {projectId, layerId, iconRow}) {
    let layerConfiguration = state[projectId].layers[layerId]
    GeoPackageUtilities.updateIconRow(layerConfiguration.geopackageFilePath, layerConfiguration.sourceLayerName, iconRow).then(function () {
      commit('updateLayerKey', {projectId, layerId})
    })
  },
  deleteProjectLayerStyleRow ({ commit, state }, {projectId, layerId, styleId}) {
    let layerConfiguration = state[projectId].layers[layerId]
    GeoPackageUtilities.deleteStyleRow(layerConfiguration.geopackageFilePath, layerConfiguration.sourceLayerName, styleId).then(function () {
      commit('updateLayerKey', {projectId, layerId})
    })
  },
  deleteProjectLayerIconRow ({ commit, state }, {projectId, layerId, iconId}) {
    let layerConfiguration = state[projectId].layers[layerId]
    GeoPackageUtilities.deleteIconRow(layerConfiguration.geopackageFilePath, layerConfiguration.sourceLayerName, iconId).then(function () {
      commit('updateLayerKey', {projectId, layerId})
    })
  },
  deleteProjectLayerFeatureRow ({ commit, state }, {projectId, layerId, featureId}) {
    let layerConfiguration = state[projectId].layers[layerId]
    GeoPackageUtilities.deleteFeatureRow(layerConfiguration.geopackageFilePath, layerConfiguration.sourceLayerName, featureId).then(function (result) {
      commit('updateLayerKey', {projectId, layerId})
      commit('updateLayerFeatureCount', {projectId, layerId, count: result.count})
      commit('updateLayerExtent', {projectId, layerId, extent: result.extent})
    })
  },
  addProjectLayerFeatureRow ({ commit, state }, {projectId, layerId, feature}) {
    let layerConfiguration = state[projectId].layers[layerId]
    GeoPackageUtilities.createFeatureRow(layerConfiguration.geopackageFilePath, layerConfiguration.sourceLayerName, feature).then(function (result) {
      commit('updateLayerKey', {projectId, layerId})
      commit('updateLayerFeatureCount', {projectId, layerId, count: result.count})
      commit('updateLayerExtent', {projectId, layerId, extent: result.extent})
    })
  },
  updateProjectLayerFeatureRow ({ commit, state }, {projectId, layerId, featureRowId, feature}) {
    let layerConfiguration = state[projectId].layers[layerId]
    GeoPackageUtilities.updateFeatureRow(layerConfiguration.geopackageFilePath, layerConfiguration.sourceLayerName, featureRowId, feature).then(function (result) {
      commit('updateLayerKey', {projectId, layerId})
      commit('updateLayerExtent', {projectId, layerId, extent: result.extent})
    })
  },
  updateProjectLayerStyleMaxFeatures ({ commit, state }, {projectId, layerId, maxFeatures}) {
    commit('updateProjectLayerStyleMaxFeatures', {projectId, layerId, maxFeatures})
  },
  updateProjectLayerUsePointIconDefault ({ commit, state }, {projectId, layerId, usePointIconDefault}) {
    let layerConfiguration = state[projectId].layers[layerId]
    GeoPackageUtilities.usePointIconDefault(layerConfiguration.geopackageFilePath, layerConfiguration.sourceLayerName, usePointIconDefault, layerConfiguration.tablePointIconRowId).then(function () {
      commit('updateLayerKey', {projectId, layerId})
    })
  },
  setGeoPackageName ({ commit, state }, {projectId, geopackageId, name}) {
    commit('setGeoPackageName', {projectId, geopackageId, name})
  },
  setGeoPackageLocation ({ commit, state }, {projectId, geopackageId, fileName}) {
    commit('setGeoPackageLocation', {projectId, geopackageId, fileName})
  },
  setGeoPackageStatus ({ commit, state }, {projectId, geopackageId, status}) {
    commit('setGeoPackageStatus', {projectId, geopackageId, status})
  },
  setGeoPackageBuildMode ({ commit, state }, {projectId, geopackageId, buildMode}) {
    commit('setGeoPackageBuildMode', {projectId, geopackageId, buildMode})
  },
  setGeoPackageStatusReset ({ commit, state }, {projectId, geopackageId}) {
    commit('setGeoPackageStatusReset', {projectId, geopackageId})
  },
  deleteProject ({ commit, state }, project) {
    commit('deleteProject', project)
    commit('UIState/deleteProject', project.id, {root: true})
  },
  deleteGeoPackage ({ commit, state }, {projectId, geopackageId}) {
    commit('deleteGeoPackage', {projectId, geopackageId})
  },
  openProject ({ commit, state }, project) {
    WindowLauncher.showProject(project.id)
  },
  updateProjectLayer ({ commit, state }, {projectId, layer}) {
    commit('updateProjectLayer', {projectId, layer})
  },
  updateProjectLayerStyle ({ commit, state }, {projectId, layerId, style}) {
    commit('updateProjectLayerStyle', {projectId, layerId, style})
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
