import Vue from 'vue'
import path from 'path'
import _ from 'lodash'
import fs from 'fs'
import WindowLauncher from '../../lib/window/WindowLauncher'
import GeoPackageUtilities from '../../lib/GeoPackageUtilities'
import UniqueIDUtilities from '../../lib/UniqueIDUtilities'
import FileUtilities from '../../lib/FileUtilities'

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
    Vue.set(state[projectId].layers[layerId], 'displayName', displayName)
  },
  addProjectLayers (state, {projectLayers}) {
    projectLayers.forEach(layer => {
      Vue.set(state[layer.project.id].layers, layer.layerId, layer.config)
    })
  },
  setGeoPackage (state, {projectId, geopackage}) {
    Vue.set(state[projectId].geopackages, geopackage.id, geopackage)
  },
  setProjectMaxFeatures (state, {projectId, maxFeatures}) {
    Vue.set(state[projectId], 'maxFeatures', maxFeatures)
  },
  setGeoPackageLayersVisible (state, {projectId, geopackageId, visible}) {
    const tables = _.cloneDeep(state[projectId].geopackages[geopackageId].tables)
    _.keys(tables.tiles).forEach(table => {
      tables.tiles[table].visible = visible
    })
    _.keys(tables.features).forEach(table => {
      tables.features[table].visible = visible
    })
    Vue.set(state[projectId].geopackages[geopackageId], 'tables', tables)
  },
  setGeoPackageFeatureTableVisible (state, {projectId, geopackageId, tableName, visible}) {
    Vue.set(state[projectId].geopackages[geopackageId].tables.features[tableName], 'visible', visible)
  },
  setGeoPackageTileTableVisible (state, {projectId, geopackageId, tableName, visible}) {
    Vue.set(state[projectId].geopackages[geopackageId].tables.tiles[tableName], 'visible', visible)
  },
  renameGeoPackage (state, {projectId, geopackageId, newPath, newName}) {
    Vue.set(state[projectId].geopackages[geopackageId], 'path', newPath)
    Vue.set(state[projectId].geopackages[geopackageId], 'name', newName)
  },
  // setGeoPackageBuildMode (state, {projectId, geopackageId, buildMode}) {
  //   Vue.set(state[projectId].geopackages[geopackageId], 'buildMode', buildMode)
  // },
  // setGeoPackageStatusReset (state, {projectId, geopackageId}) {
  //   Vue.delete(state[projectId].geopackages[geopackageId], 'status')
  //   Vue.delete(state[projectId].geopackages[geopackageId], 'buildMode')
  // },
  // addGeoPackageTileConfiguration (state, {projectId, geopackageId, tileConfiguration}) {
  //   Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations, tileConfiguration.id, tileConfiguration)
  // },
  // setGeoPackageTileTableName (state, {projectId, geopackageId, configId, tableName}) {
  //   Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'tableName', tableName)
  // },
  // setGeoPackageTileConfigurationName (state, {projectId, geopackageId, configId, configurationName}) {
  //   Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'configurationName', configurationName)
  // },
  // setGeoPackageTileConfigurationTileLayers (state, {projectId, geopackageId, configId, tileLayers}) {
  //   Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'tileLayers', tileLayers)
  // },
  // setGeoPackageTileConfigurationVectorLayers (state, {projectId, geopackageId, configId, vectorLayers}) {
  //   Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'vectorLayers', vectorLayers)
  // },
  // setGeoPackageTileConfigurationBoundingBox (state, {projectId, geopackageId, configId, boundingBox}) {
  //   Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'boundingBox', boundingBox)
  // },
  // setGeoPackageTileConfigurationRenderingOrder (state, {projectId, geopackageId, configId, renderingOrder}) {
  //   Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'renderingOrder', renderingOrder)
  // },
  // toggleGeoPackageTileConfigurationBoundingBoxEditing (state, {projectId, geopackageId, configId, enabled}) {
  //   Object.values(state[projectId].geopackages).forEach(gp => {
  //     Object.values(gp.tileConfigurations).forEach(vc => {
  //       if (vc.boundingBoxEditingEnabled) {
  //         Vue.set(state[projectId].geopackages[gp.id].tileConfigurations[vc.id], 'boundingBoxEditingEnabled', false)
  //       }
  //     })
  //     Object.values(gp.vectorConfigurations).forEach(tc => {
  //       if (tc.boundingBoxEditingEnabled) {
  //         Vue.set(state[projectId].geopackages[gp.id].vectorConfigurations[tc.id], 'boundingBoxEditingEnabled', false)
  //       }
  //     })
  //   })
  //   Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'boundingBoxEditingEnabled', enabled)
  // },
  // setGeoPackageTileConfigurationTileScaling (state, {projectId, geopackageId, configId, tileScaling}) {
  //   Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'tileScaling', tileScaling)
  // },
  // setGeoPackageTileConfigurationMinZoom (state, {projectId, geopackageId, configId, minZoom}) {
  //   if (minZoom < 0) {
  //     minZoom = 0
  //   }
  //   if (minZoom > 20) {
  //     minZoom = 20
  //   }
  //   if (minZoom > state[projectId].geopackages[geopackageId].tileConfigurations[configId].maxZoom) {
  //     Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'maxZoom', minZoom)
  //   }
  //   Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'minZoom', minZoom)
  // },
  // setGeoPackageTileConfigurationMaxZoom (state, {projectId, geopackageId, configId, maxZoom}) {
  //   if (maxZoom < 0) {
  //     maxZoom = 0
  //   }
  //   if (maxZoom > 20) {
  //     maxZoom = 20
  //   }
  //   if (maxZoom < state[projectId].geopackages[geopackageId].tileConfigurations[configId].minZoom) {
  //     Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'minZoom', maxZoom)
  //   }
  //   Vue.set(state[projectId].geopackages[geopackageId].tileConfigurations[configId], 'maxZoom', maxZoom)
  // },
  // deleteGeoPackageTileConfiguration (state, {projectId, geopackageId, configId}) {
  //   Vue.delete(state[projectId].geopackages[geopackageId].tileConfigurations, configId)
  // },
  // addGeoPackageVectorConfiguration (state, {projectId, geopackageId, vectorConfiguration}) {
  //   Vue.set(state[projectId].geopackages[geopackageId].vectorConfigurations, vectorConfiguration.id, vectorConfiguration)
  // },
  // setGeoPackageVectorConfigurationName (state, {projectId, geopackageId, configId, configurationName}) {
  //   Vue.set(state[projectId].geopackages[geopackageId].vectorConfigurations[configId], 'configurationName', configurationName)
  // },
  // setGeoPackageVectorConfigurationVectorLayers (state, {projectId, geopackageId, configId, vectorLayers}) {
  //   Vue.set(state[projectId].geopackages[geopackageId].vectorConfigurations[configId], 'vectorLayers', vectorLayers)
  // },
  // setGeoPackageVectorConfigurationBoundingBox (state, {projectId, geopackageId, configId, boundingBox}) {
  //   Vue.set(state[projectId].geopackages[geopackageId].vectorConfigurations[configId], 'boundingBox', boundingBox)
  // },
  // toggleGeoPackageVectorConfigurationBoundingBoxEditing (state, {projectId, geopackageId, configId, enabled}) {
  //   // when enabling bounding box editing for a configuration, we will need to first disable boundingBoxEditingEnabled for other configurations
  //   Object.values(state[projectId].geopackages).forEach(gp => {
  //     Object.values(gp.vectorConfigurations).forEach(vc => {
  //       if (vc.boundingBoxEditingEnabled) {
  //         Vue.set(state[projectId].geopackages[gp.id].vectorConfigurations[vc.id], 'boundingBoxEditingEnabled', false)
  //       }
  //     })
  //     Object.values(gp.tileConfigurations).forEach(tc => {
  //       if (tc.boundingBoxEditingEnabled) {
  //         Vue.set(state[projectId].geopackages[gp.id].tileConfigurations[tc.id], 'boundingBoxEditingEnabled', false)
  //       }
  //     })
  //   })
  //   Vue.set(state[projectId].geopackages[geopackageId].vectorConfigurations[configId], 'boundingBoxEditingEnabled', enabled)
  // },
  // deleteGeoPackageVectorConfiguration (state, {projectId, geopackageId, configId}) {
  //   Vue.delete(state[projectId].geopackages[geopackageId].vectorConfigurations, configId)
  // },
  toggleProjectLayer (state, {projectId, layerId}) {
    Vue.set(state[projectId].layers[layerId], 'visible', !state[projectId].layers[layerId].visible)
  },
  // setGeoPackageName (state, {projectId, geopackageId, name}) {
  //   Vue.set(state[projectId].geopackages[geopackageId], 'name', name)
  // },
  // setGeoPackageLocation (state, { projectId, geopackageId, fileName }) {
  //   Vue.set(state[projectId].geopackages[geopackageId], 'fileName', fileName)
  // },
  // setGeoPackageStatus (state, {projectId, geopackageId, status}) {
  //   Vue.set(state[projectId].geopackages[geopackageId], 'status', status)
  // },
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
  updateStyleKey (state, {projectId, id, tableName, isGeoPackage}) {
    if (isGeoPackage) {
      if (state[projectId].geopackages[id].tables.features[tableName]) {
        Vue.set(state[projectId].geopackages[id].tables.features[tableName], 'styleKey', state[projectId].geopackages[id].tables.features[tableName].styleKey + 1)
      } else if (state[projectId].geopackages[id].tables.tiles[tableName]) {
        Vue.set(state[projectId].geopackages[id].tables.tiles[tableName], 'styleKey', state[projectId].geopackages[id].tables.tiles[tableName].styleKey + 1)
      }
    } else {
      Vue.set(state[projectId].layers[id], 'styleKey', state[projectId].layers[id].styleKey + 1)
    }
  },
  updateLayerFeatureCount (state, {projectId, layerId, count}) {
    Vue.set(state[projectId].layers[layerId], 'count', count)
  },
  updateLayerExtent (state, {projectId, layerId, extent}) {
    Vue.set(state[projectId].layers[layerId], 'extent', extent)
  },
  updateTableStyleAssignmentGeometryType (state, {projectId, id, tableName, geometryType, isGeoPackage}) {
    if (isGeoPackage) {
      const copy = _.cloneDeep(state[projectId].geopackages[id].tableStyleAssignment)
      copy.table = tableName
      copy.geometryType = geometryType
      Vue.set(state[projectId].geopackages[id], 'tableStyleAssignment', copy)
    } else {
      const copy = _.cloneDeep(state[projectId].layers[id].tableStyleAssignment)
      copy.table = tableName
      copy.geometryType = geometryType
      Vue.set(state[projectId].layers[id], 'tableStyleAssignment', copy)
    }
  },
  updateTableIconAssignmentGeometryType (state, {projectId, id, tableName, geometryType, isGeoPackage}) {
    if (isGeoPackage) {
      const copy = _.cloneDeep(state[projectId].geopackages[id].tableIconAssignment)
      copy.table = tableName
      copy.geometryType = geometryType
      Vue.set(state[projectId].geopackages[id], 'tableIconAssignment', copy)
    } else {
      const copy = _.cloneDeep(state[projectId].layers[id].tableIconAssignment)
      copy.table = tableName
      copy.geometryType = geometryType
      Vue.set(state[projectId].layers[id], 'tableIconAssignment', copy)
    }
  },
  updateStyleAssignmentFeature (state, {projectId, id, tableName, featureId, isGeoPackage}) {
    if (isGeoPackage) {
      const copy = _.cloneDeep(state[projectId].geopackages[id].styleAssignment)
      copy.table = tableName
      copy.featureId = featureId
      Vue.set(state[projectId].geopackages[id], 'styleAssignment', copy)
    } else {
      const copy = _.cloneDeep(state[projectId].layers[id].styleAssignment)
      copy.table = tableName
      copy.featureId = featureId
      Vue.set(state[projectId].layers[id], 'styleAssignment', copy)
    }
  },
  updateIconAssignmentFeature (state, {projectId, id, tableName, featureId, isGeoPackage}) {
    if (isGeoPackage) {
      const copy = _.cloneDeep(state[projectId].geopackages[id].iconAssignment)
      copy.table = tableName
      copy.featureId = featureId
      Vue.set(state[projectId].geopackages[id], 'iconAssignment', copy)
    } else {
      const copy = _.cloneDeep(state[projectId].layers[id].iconAssignment)
      copy.table = tableName
      copy.featureId = featureId
      Vue.set(state[projectId].layers[id], 'iconAssignment', copy)
    }
  },
  deleteProject (state, project) {
    Vue.delete(state, project.id)
  },
  removeGeoPackage (state, {projectId, geopackageId}) {
    Vue.delete(state[projectId].geopackages, geopackageId)
  },
  renameGeoPackageTileTable (state, {projectId, geopackageId, oldTableName, newTableName}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    let table = geopackageCopy.tables.tiles[oldTableName]
    delete geopackageCopy.tables.tiles[oldTableName]
    geopackageCopy.tables.tiles[newTableName] = table
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  copyGeoPackageTileTable (state, {projectId, geopackageId, tableName, copyTableName}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    geopackageCopy.tables.tiles[copyTableName] = _.cloneDeep(geopackageCopy.tables.tiles[tableName])
    geopackageCopy.tables.tiles[copyTableName].visible = false
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  deleteGeoPackageTileTable (state, {projectId, geopackageId, tableName}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    delete geopackageCopy.tables.tiles[tableName]
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  renameGeoPackageFeatureTable (state, {projectId, geopackageId, oldTableName, newTableName}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    let table = geopackageCopy.tables.features[oldTableName]
    delete geopackageCopy.tables.features[oldTableName]
    geopackageCopy.tables.features[newTableName] = table
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  copyGeoPackageFeatureTable (state, {projectId, geopackageId, tableName, copyTableName}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    geopackageCopy.tables.features[copyTableName] = _.cloneDeep(geopackageCopy.tables.features[tableName])
    geopackageCopy.tables.features[copyTableName].visible = false
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  deleteGeoPackageFeatureTable (state, {projectId, geopackageId, tableName}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    delete geopackageCopy.tables.features[tableName]
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  setZoomControlEnabled (state, {projectId, enabled}) {
    Vue.set(state[projectId], 'zoomControlEnabled', enabled)
  },
  setDisplayZoomEnabled (state, {projectId, enabled}) {
    Vue.set(state[projectId], 'displayZoomEnabled', enabled)
  },
  clearActiveLayers (state, {projectId}) {
    const projectCopy = _.cloneDeep(state[projectId])
    _.keys(projectCopy.geopackages).forEach(key => {
      const geopackage = projectCopy.geopackages[key]
      _.keys(geopackage.tables.tiles).forEach(table => {
        geopackage.tables.tiles[table].visible = false
      })
      _.keys(geopackage.tables.features).forEach(table => {
        geopackage.tables.features[table].visible = false
      })
    })
    _.keys(projectCopy.layers).forEach(key => {
      const layer = projectCopy.layers[key]
      layer.visible = false
    })
    Vue.set(state, projectId, projectCopy)
  },
  zoomToExtent (state, {projectId, extent}) {
    let key = 0
    if (!_.isNil(state[projectId].zoomToExtent)) {
      key = (!_.isNil(state[projectId].zoomToExtent.key) ? state[projectId].zoomToExtent.key : 0) + 1
    }
    Vue.set(state[projectId], 'zoomToExtent', {extent, key})
  }
}

const actions = {
  newProject ({ dispatch, commit, state }) {
    let project = {
      id: UniqueIDUtilities.createUniqueID(),
      name: 'New Project',
      layerCount: 0,
      layers: {},
      geopackages: {},
      zoomControlEnabled: true,
      displayZoomEnabled: true,
      maxFeatures: 1000
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
  addProjectLayers ({ commit, state }, {projectLayers}) {
    commit('addProjectLayers', {projectLayers})
  },
  addGeoPackage ({ commit, state }, {projectId, filePath}) {
    GeoPackageUtilities.getOrCreateGeoPackageForApp(filePath).then(geopackage => {
      geopackage.styleAssignment = {table: null, featureId: -1}
      geopackage.iconAssignment = {table: null, featureId: -1}
      geopackage.tableStyleAssignment = {table: null, geometryType: -1}
      geopackage.tableIconAssignment = {table: null, geometryType: -1}
      commit('setGeoPackage', {projectId, geopackage})
    })
  },
  setGeoPackageLayersVisible ({ commit, state }, {projectId, geopackageId, visible}) {
    commit('setGeoPackageLayersVisible', {projectId, geopackageId, visible})
  },
  setGeoPackageFeatureTableVisible ({ commit, state }, {projectId, geopackageId, tableName, visible}) {
    commit('setGeoPackageFeatureTableVisible', {projectId, geopackageId, tableName, visible})
  },
  setGeoPackageTileTableVisible ({ commit, state }, {projectId, geopackageId, tableName, visible}) {
    commit('setGeoPackageTileTableVisible', {projectId, geopackageId, tableName, visible})
  },
  renameGeoPackage ({ commit, state }, {projectId, geopackageId, name}) {
    const oldPath = state[projectId].geopackages[geopackageId].path
    const newPath = path.join(path.dirname(oldPath), name + '.gpkg')
    fs.renameSync(oldPath, newPath)
    commit('renameGeoPackage', {projectId, geopackageId, newPath, newName: name})
  },
  copyGeoPackage ({ commit, state }, {projectId, geopackageId, name}) {
    const oldPath = state[projectId].geopackages[geopackageId].path
    const newPath = path.join(path.dirname(oldPath), name + '.gpkg')
    fs.copyFileSync(oldPath, newPath)
    GeoPackageUtilities.getOrCreateGeoPackageForApp(newPath).then(geopackage => {
      commit('addGeoPackage', {projectId, geopackage})
    })
  },
  removeGeoPackage ({ commit, state }, {projectId, geopackageId}) {
    commit('removeGeoPackage', {projectId, geopackageId})
  },
  renameGeoPackageTileTable ({ commit, state }, {projectId, geopackageId, oldTableName, newTableName}) {
    return new Promise((resolve) => {
      return GeoPackageUtilities.renameGeoPackageTable(state[projectId].geopackages[geopackageId].path, oldTableName, newTableName).then(() => {
        commit('renameGeoPackageTileTable', {projectId, geopackageId, oldTableName, newTableName})
        resolve()
      })
    })
  },
  copyGeoPackageTileTable ({ commit, state }, {projectId, geopackageId, tableName, copyTableName}) {
    return new Promise((resolve) => {
      return GeoPackageUtilities.copyGeoPackageTable(state[projectId].geopackages[geopackageId].path, tableName, copyTableName).then(() => {
        commit('copyGeoPackageTileTable', {projectId, geopackageId, tableName, copyTableName})
        resolve()
      })
    })
  },
  deleteGeoPackageTileTable ({ commit, state }, {projectId, geopackageId, tableName}) {
    GeoPackageUtilities.deleteGeoPackageTable(state[projectId].geopackages[geopackageId].path, tableName).then(() => {
      commit('deleteGeoPackageTileTable', {projectId, geopackageId, tableName})
    })
  },
  renameGeoPackageFeatureTable ({ commit, state }, {projectId, geopackageId, oldTableName, newTableName}) {
    return new Promise((resolve) => {
      return GeoPackageUtilities.renameGeoPackageTable(state[projectId].geopackages[geopackageId].path, oldTableName, newTableName).then(() => {
        commit('renameGeoPackageFeatureTable', {projectId, geopackageId, oldTableName, newTableName})
        resolve()
      })
    })
  },
  copyGeoPackageFeatureTable ({ commit, state }, {projectId, geopackageId, tableName, copyTableName}) {
    return new Promise((resolve) => {
      return GeoPackageUtilities.copyGeoPackageTable(state[projectId].geopackages[geopackageId].path, tableName, copyTableName).then(() => {
        commit('copyGeoPackageFeatureTable', {projectId, geopackageId, tableName, copyTableName})
        resolve()
      })
    })
  },
  deleteGeoPackageFeatureTable ({ commit, state }, {projectId, geopackageId, tableName}) {
    GeoPackageUtilities.deleteGeoPackageTable(state[projectId].geopackages[geopackageId].path, tableName).then(() => {
      commit('deleteGeoPackageFeatureTable', {projectId, geopackageId, tableName})
    })
  },
  // addGeoPackage ({ commit, state }, {project}) {
  //   let name = project.name + ' GeoPackage Configuration'
  //   if (Object.keys(project.geopackages).length) {
  //     name += ' ' + Object.keys(project.geopackages).length
  //   }
  //   let tileLayers = {}
  //   let vectorLayers = {}
  //   for (const layerId in project.layers) {
  //     let layer = project.layers[layerId]
  //     if (layer.pane === 'tile' && !tileLayers[layerId]) {
  //       tileLayers[layerId] = {
  //         id: layer.id,
  //         included: layer.shown,
  //         name: layer.name,
  //         displayName: layer.displayName || layer.name,
  //         style: layer.style
  //       }
  //     }
  //     if (layer.pane === 'vector' && !vectorLayers[layerId]) {
  //       vectorLayers[layerId] = {
  //         id: layer.id,
  //         included: layer.shown,
  //         name: layer.name,
  //         displayName: layer.displayName || layer.name,
  //         style: layer.style,
  //         geopackageFilePath: layer.geopackageFilePath,
  //         sourceLayerName: layer.sourceLayerName
  //       }
  //     }
  //   }
  //
  //   let geopackage = {
  //     id: UniqueIDUtilities.createUniqueID(),
  //     name: name,
  //     vectorConfigurations: {},
  //     tileConfigurations: {},
  //     layers: Object.keys(project.layers),
  //     tileLayers: tileLayers,
  //     vectorLayers: vectorLayers
  //   }
  //   commit('addGeoPackage', {project, geopackage})
  // },
  // addGeoPackageTileConfiguration ({ commit, state }, {projectId, geopackageId}) {
  //   let count = 1
  //   let tableName = 'TileTable' + count
  //   while (Object.values(state[projectId].geopackages[geopackageId].tileConfigurations).findIndex(config => config.tableName === tableName) !== -1) {
  //     count++
  //     tableName = 'TileTable' + count
  //   }
  //   count = 1
  //   let configName = 'Tile Configuration ' + count
  //   while (Object.values(state[projectId].geopackages[geopackageId].tileConfigurations).findIndex(config => config.configurationName === configName) !== -1) {
  //     count++
  //     configName = 'Tile Configuration ' + count
  //   }
  //   let tileConfiguration = {
  //     id: UniqueIDUtilities.createUniqueID(),
  //     type: 'tile',
  //     configurationName: configName,
  //     tableName: tableName,
  //     tileLayers: [],
  //     vectorLayers: [],
  //     renderingOrder: [],
  //     minZoom: 0,
  //     maxZoom: 0,
  //     tileScaling: false,
  //     boundingBox: undefined,
  //     boundingBoxEditingEnabled: false
  //   }
  //   commit('addGeoPackageTileConfiguration', {projectId, geopackageId, tileConfiguration})
  // },
  // setGeoPackageTileConfigurationName ({ commit, state }, {projectId, geopackageId, configId, configurationName}) {
  //   commit('setGeoPackageTileConfigurationName', {projectId, geopackageId, configId, configurationName})
  // },
  // setGeoPackageTileTableName ({ commit, state }, {projectId, geopackageId, configId, tableName}) {
  //   commit('setGeoPackageTileTableName', {projectId, geopackageId, configId, tableName})
  // },
  // setGeoPackageTileConfigurationTileLayers ({ commit, state }, {projectId, geopackageId, configId, tileLayers}) {
  //   commit('setGeoPackageTileConfigurationTileLayers', {projectId, geopackageId, configId, tileLayers})
  // },
  // setGeoPackageTileConfigurationVectorLayers ({ commit, state }, {projectId, geopackageId, configId, vectorLayers}) {
  //   commit('setGeoPackageTileConfigurationVectorLayers', {projectId, geopackageId, configId, vectorLayers})
  // },
  // setGeoPackageTileConfigurationBoundingBox ({ commit, state }, {projectId, geopackageId, configId, boundingBox}) {
  //   commit('setGeoPackageTileConfigurationBoundingBox', {projectId, geopackageId, configId, boundingBox})
  // },
  // setGeoPackageTileConfigurationRenderingOrder ({ commit, state }, {projectId, geopackageId, configId, renderingOrder}) {
  //   commit('setGeoPackageTileConfigurationRenderingOrder', {projectId, geopackageId, configId, renderingOrder})
  // },
  // setGeoPackageTileConfigurationTileScaling ({ commit, state }, {projectId, geopackageId, configId, tileScaling}) {
  //   commit('setGeoPackageTileConfigurationTileScaling', {projectId, geopackageId, configId, tileScaling})
  // },
  // setGeoPackageTileConfigurationMinZoom ({ commit, state }, {projectId, geopackageId, configId, minZoom}) {
  //   commit('setGeoPackageTileConfigurationMinZoom', {projectId, geopackageId, configId, minZoom})
  // },
  // setGeoPackageTileConfigurationMaxZoom ({ commit, state }, {projectId, geopackageId, configId, maxZoom}) {
  //   commit('setGeoPackageTileConfigurationMaxZoom', {projectId, geopackageId, configId, maxZoom})
  // },
  // toggleGeoPackageTileConfigurationBoundingBoxEditing ({ commit, state }, {projectId, geopackageId, configId, enabled}) {
  //   commit('toggleGeoPackageTileConfigurationBoundingBoxEditing', {projectId, geopackageId, configId, enabled})
  // },
  // deleteGeoPackageTileConfiguration ({ commit, state }, {projectId, geopackageId, configId}) {
  //   commit('deleteGeoPackageTileConfiguration', {projectId, geopackageId, configId})
  // },
  // addGeoPackageVectorConfiguration ({ commit, state }, {projectId, geopackageId}) {
  //   let count = 1
  //   let configName = 'Vector Configuration #' + count
  //   while (Object.values(state[projectId].geopackages[geopackageId].vectorConfigurations).findIndex(config => config.configurationName === configName) !== -1) {
  //     count++
  //     configName = 'Vector Configuration #' + count
  //   }
  //   let vectorConfiguration = {
  //     id: UniqueIDUtilities.createUniqueID(),
  //     type: 'vector',
  //     configurationName: configName,
  //     vectorLayers: [],
  //     boundingBox: undefined,
  //     boundingBoxEditingEnabled: false,
  //     indexed: true
  //   }
  //   commit('addGeoPackageVectorConfiguration', {projectId, geopackageId, vectorConfiguration})
  // },
  // setGeoPackageVectorConfigurationName ({ commit, state }, {projectId, geopackageId, configId, configurationName}) {
  //   commit('setGeoPackageVectorConfigurationName', {projectId, geopackageId, configId, configurationName})
  // },
  // setGeoPackageVectorConfigurationVectorLayers ({ commit, state }, {projectId, geopackageId, configId, vectorLayers}) {
  //   commit('setGeoPackageVectorConfigurationVectorLayers', {projectId, geopackageId, configId, vectorLayers})
  // },
  // setGeoPackageVectorConfigurationBoundingBox ({ commit, state }, {projectId, geopackageId, configId, boundingBox}) {
  //   commit('setGeoPackageVectorConfigurationBoundingBox', {projectId, geopackageId, configId, boundingBox})
  // },
  // toggleGeoPackageVectorConfigurationBoundingBoxEditing ({ commit, state }, {projectId, geopackageId, configId, enabled}) {
  //   commit('toggleGeoPackageVectorConfigurationBoundingBoxEditing', {projectId, geopackageId, configId, enabled})
  // },
  // deleteGeoPackageVectorConfiguration ({ commit, state }, {projectId, geopackageId, configId}) {
  //   commit('deleteGeoPackageVectorConfiguration', {projectId, geopackageId, configId})
  // },
  toggleProjectLayer ({ commit, state }, {projectId, layerId}) {
    commit('toggleProjectLayer', {projectId, layerId})
  },
  removeProjectLayer ({ commit, state }, {projectId, layerId}) {
    try {
      FileUtilities.rmSourceDirectory(state[projectId].layers[layerId].sourceId)
    } catch (error) {
      console.error(error)
    }
    commit('removeProjectLayer', {projectId, layerId})
  },
  updateStyleAssignmentFeature ({ commit, state }, {projectId, id, tableName, featureId, isGeoPackage}) {
    commit('updateStyleAssignmentFeature', {projectId, id, tableName, featureId, isGeoPackage})
  },
  updateIconAssignmentFeature ({ commit, state }, {projectId, id, tableName, featureId, isGeoPackage}) {
    commit('updateIconAssignmentFeature', {projectId, id, tableName, featureId, isGeoPackage})
  },
  updateTableStyleAssignmentGeometryType ({ commit, state }, {projectId, id, tableName, geometryType, isGeoPackage}) {
    commit('updateTableStyleAssignmentGeometryType', {projectId, id, tableName, geometryType, isGeoPackage})
  },
  updateTableIconAssignmentGeometryType ({ commit, state }, {projectId, id, tableName, geometryType, isGeoPackage}) {
    commit('updateTableIconAssignmentGeometryType', {projectId, id, tableName, geometryType, isGeoPackage})
  },
  updateFeatureStyleSelection ({ commit, state }, {projectId, id, tableName, featureId, styleId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.setFeatureStyle(filePath, tableName, featureId, styleId).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  updateFeatureIconSelection ({ commit, state }, {projectId, id, tableName, featureId, iconId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.setFeatureIcon(filePath, tableName, featureId, iconId).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  updateTableStyleSelection ({ commit, state }, {projectId, id, tableName, geometryType, styleId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.setTableStyle(filePath, tableName, geometryType, styleId).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  updateTableIconSelection ({ commit, state }, {projectId, id, tableName, geometryType, iconId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.setTableIcon(filePath, tableName, geometryType, iconId).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  createProjectLayerStyleRow ({ commit, state }, {projectId, id, tableName, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.createStyleRow(filePath, tableName).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  createProjectLayerIconRow ({ commit, state }, {projectId, id, tableName, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.createIconRow(filePath, tableName).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  updateProjectLayerStyleRow ({ commit, state }, {projectId, id, tableName, styleRow, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.updateStyleRow(filePath, tableName, styleRow).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  updateProjectLayerIconRow ({ commit, state }, {projectId, id, tableName, iconRow, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.updateIconRow(filePath, tableName, iconRow).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  deleteProjectLayerStyleRow ({ commit, state }, {projectId, id, tableName, styleId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.deleteStyleRow(filePath, tableName, styleId).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  deleteProjectLayerIconRow ({ commit, state }, {projectId, id, tableName, iconId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.deleteIconRow(filePath, tableName, iconId).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  deleteProjectLayerFeatureRow ({ commit, state }, {projectId, id, tableName, featureId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.deleteFeatureRow(filePath, tableName, featureId).then(function (result) {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  updateProjectLayerFeatureRow ({ commit, state }, {projectId, id, tableName, featureRowId, feature, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.updateFeatureRow(filePath, tableName, featureRowId, feature).then(function (result) {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  addStyleExtensionForTable ({ commit, state }, {projectId, id, tableName, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.addStyleExtensionForTable(filePath, tableName).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  removeStyleExtensionForTable ({ commit, state }, {projectId, id, tableName, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].layers[id].geopackageFilePath
    GeoPackageUtilities.removeStyleExtensionForTable(filePath, tableName).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  addFeatureTableToGeoPackage ({ commit, state }, {projectId, geopackageId, tableName, featureCollection}) {
    const geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    const filePath = geopackageCopy.path
    GeoPackageUtilities.createFeatureTable(filePath, tableName, featureCollection).then(function () {
      GeoPackageUtilities.getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
        geopackageCopy.size = GeoPackageUtilities.getGeoPackageFileSize(filePath)
        geopackageCopy.tables.features[tableName] = _.cloneDeep(tableInfo)
        commit('setGeoPackage', {projectId, geopackage: geopackageCopy})
      })
    })
  },
  addFeatureToGeoPackage ({ commit, state }, {projectId, geopackageId, tableName, feature}) {
    const geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    const existingTable = geopackageCopy.tables.features[tableName]
    const filePath = state[projectId].geopackages[geopackageId].path
    GeoPackageUtilities.addFeatureToFeatureTable(filePath, tableName, feature).then(function () {
      GeoPackageUtilities.getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
        geopackageCopy.size = GeoPackageUtilities.getGeoPackageFileSize(filePath)
        existingTable.featureCount = tableInfo.featureCount
        existingTable.description = tableInfo.description
        existingTable.styleKey = existingTable.styleKey + 1
        existingTable.indexed = tableInfo.indexed
        commit('setGeoPackage', {projectId, geopackage: geopackageCopy})
      })
    })
  },
  updateFeatureTable ({ commit, state }, {projectId, geopackageId, tableName}) {
    const geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    console.log('geopackageCopy')
    console.log(geopackageCopy)
    const existingTable = geopackageCopy.tables.features[tableName]
    const filePath = state[projectId].geopackages[geopackageId].path
    GeoPackageUtilities.getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
      geopackageCopy.size = GeoPackageUtilities.getGeoPackageFileSize(filePath)
      existingTable.featureCount = tableInfo.featureCount
      existingTable.description = tableInfo.description
      existingTable.styleKey = existingTable.styleKey + 1
      existingTable.indexed = tableInfo.indexed
      commit('setGeoPackage', {projectId, geopackage: geopackageCopy})
    })
  },
  removeFeatureFromGeopackage ({ commit, state }, {projectId, geopackageId, tableName, featureId}) {
    const geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    const existingTable = geopackageCopy.tables.features[tableName]
    const filePath = state[projectId].geopackages[geopackageId].path
    GeoPackageUtilities.deleteFeatureRow(filePath, tableName, featureId).then(function () {
      GeoPackageUtilities.getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
        geopackageCopy.size = GeoPackageUtilities.getGeoPackageFileSize(filePath)
        existingTable.featureCount = tableInfo.featureCount
        existingTable.description = tableInfo.description
        commit('setGeoPackage', {projectId, geopackage: geopackageCopy})
      })
    })
  },
  editFeatureFromGeopackage ({ commit, state }, {projectId, geopackageId, tableName, featureId, feature}) {
    // TODO: what changed and how does that impact the feature table? will there be geometry changes?
  },
  // setGeoPackageName ({ commit, state }, {projectId, geopackageId, name}) {
  //   commit('setGeoPackageName', {projectId, geopackageId, name})
  // },
  // setGeoPackageLocation ({ commit, state }, {projectId, geopackageId, fileName}) {
  //   commit('setGeoPackageLocation', {projectId, geopackageId, fileName})
  // },
  // setGeoPackageStatus ({ commit, state }, {projectId, geopackageId, status}) {
  //   commit('setGeoPackageStatus', {projectId, geopackageId, status})
  // },
  // setGeoPackageBuildMode ({ commit, state }, {projectId, geopackageId, buildMode}) {
  //   commit('setGeoPackageBuildMode', {projectId, geopackageId, buildMode})
  // },
  // setGeoPackageStatusReset ({ commit, state }, {projectId, geopackageId}) {
  //   commit('setGeoPackageStatusReset', {projectId, geopackageId})
  // },
  deleteProject ({ commit, state }, project) {
    commit('deleteProject', project)
    commit('UIState/deleteProject', project.id, {root: true})
  },
  openProject ({ commit, state }, project) {
    WindowLauncher.showProject(project.id)
  },
  updateProjectLayer ({ commit, state }, {projectId, layer}) {
    commit('updateProjectLayer', {projectId, layer})
  },
  setProjectMaxFeatures ({ commit, state }, {projectId, maxFeatures}) {
    commit('setProjectMaxFeatures', {projectId, maxFeatures})
  },
  setZoomControlEnabled ({ commit, state }, {projectId, enabled}) {
    commit('setZoomControlEnabled', {projectId, enabled})
  },
  setDisplayZoomEnabled ({ commit, state }, {projectId, enabled}) {
    commit('setDisplayZoomEnabled', {projectId, enabled})
  },
  clearActiveLayers ({ commit, state }, {projectId}) {
    commit('clearActiveLayers', {projectId})
  },
  zoomToExtent ({ commit, state }, {projectId, extent}) {
    commit('zoomToExtent', {projectId, extent})
  },
  synchronizeGeoPackage ({ commit, state }, {projectId, geopackageId}) {
    const geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    GeoPackageUtilities.getOrCreateGeoPackageForApp(geopackageCopy.path).then(geopackage => {
      geopackage.id = geopackageId
      geopackage.styleAssignment = geopackageCopy.styleAssignment
      geopackage.iconAssignment = geopackageCopy.iconAssignment
      geopackage.tableStyleAssignment = geopackageCopy.tableStyleAssignment
      geopackage.tableIconAssignment = geopackageCopy.tableIconAssignment
      _.keys(geopackage.tables.features).forEach(table => {
        const featureTable = geopackage.tables.features[table]
        const originalTable = geopackage.tables.features[table]
        if (!_.isNil(originalTable)) {
          featureTable.visible = originalTable.visible
        }
      })
      _.keys(geopackage.tables.tiles).forEach(table => {
        const tileTable = geopackage.tables.tiles[table]
        const originalTable = geopackage.tables.tiles[table]
        if (!_.isNil(originalTable)) {
          tileTable.visible = originalTable.visible
        }
      })
      commit('setGeoPackage', {projectId, geopackage})
    })
  },
  validateData ({ dispatch, state }) {
    const copiedState = _.cloneDeep(state)
    _.keys(copiedState).forEach(projectId => {
      const project = copiedState[projectId]
      // update geopackages
      _.keys(project.geopackages).forEach(geopackageId => {
        const geopackage = project.geopackages[geopackageId]
        if (!fs.existsSync(geopackage.path)) {
          dispatch('removeGeoPackage', {projectId, geopackageId})
        } else {
          // dispatch('addGeoPackage', {projectId, filePath: geopackage.path})
        }
      })
    })
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
