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
  setDataSourceDisplayName (state, {projectId, sourceId, displayName}) {
    Vue.set(state[projectId].sources[sourceId], 'displayName', displayName)
  },
  addDataSources (state, {dataSources}) {
    dataSources.forEach(source => {
      Vue.set(state[source.project.id].sources, source.sourceId, source.config)
    })
  },
  setGeoPackage (state, {projectId, geopackage}) {
    geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
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
  setDataSourceVisible (state, {projectId, sourceId, visible}) {
    Vue.set(state[projectId].sources[sourceId], 'visible', visible)
  },
  removeDataSource (state, {projectId, sourceId}) {
    Vue.delete(state[projectId].sources, sourceId)
  },
  updateStyleKey (state, {projectId, id, tableName, isGeoPackage}) {
    if (isGeoPackage) {
      const geopackageCopy = _.cloneDeep(state[projectId].geopackages[id])
      geopackageCopy.modifiedDate = FileUtilities.getLastModifiedDate(geopackageCopy.path)
      if (geopackageCopy.tables.features[tableName]) {
        geopackageCopy.tables.features[tableName].styleKey = geopackageCopy.tables.features[tableName].styleKey + 1
      } else if (geopackageCopy.tables.tiles[tableName]) {
        geopackageCopy.tables.tiles[tableName].styleKey = geopackageCopy.tables.tiles[tableName].styleKey + 1
      }
      Vue.set(state[projectId].geopackages, id, geopackageCopy)
    } else {
      Vue.set(state[projectId].sources[id], 'styleKey', state[projectId].sources[id].styleKey + 1)
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
    geopackageCopy.modifiedDate = FileUtilities.getLastModifiedDate(geopackageCopy.path)
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  copyGeoPackageTileTable (state, {projectId, geopackageId, tableName, copyTableName}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    geopackageCopy.tables.tiles[copyTableName] = _.cloneDeep(geopackageCopy.tables.tiles[tableName])
    geopackageCopy.tables.tiles[copyTableName].visible = false
    geopackageCopy.modifiedDate = FileUtilities.getLastModifiedDate(geopackageCopy.path)
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  deleteGeoPackageTileTable (state, {projectId, geopackageId, tableName}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    delete geopackageCopy.tables.tiles[tableName]
    geopackageCopy.modifiedDate = FileUtilities.getLastModifiedDate(geopackageCopy.path)
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  renameGeoPackageFeatureTable (state, {projectId, geopackageId, oldTableName, newTableName}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    let table = geopackageCopy.tables.features[oldTableName]
    delete geopackageCopy.tables.features[oldTableName]
    geopackageCopy.tables.features[newTableName] = table
    geopackageCopy.modifiedDate = FileUtilities.getLastModifiedDate(geopackageCopy.path)
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  copyGeoPackageFeatureTable (state, {projectId, geopackageId, tableName, copyTableName}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    geopackageCopy.tables.features[copyTableName] = _.cloneDeep(geopackageCopy.tables.features[tableName])
    geopackageCopy.tables.features[copyTableName].visible = false
    geopackageCopy.modifiedDate = FileUtilities.getLastModifiedDate(geopackageCopy.path)
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  deleteGeoPackageFeatureTable (state, {projectId, geopackageId, tableName}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    delete geopackageCopy.tables.features[tableName]
    geopackageCopy.modifiedDate = FileUtilities.getLastModifiedDate(geopackageCopy.path)
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  renameGeoPackageFeatureTableColumn (state, {projectId, geopackageId}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    geopackageCopy.modifiedDate = FileUtilities.getLastModifiedDate(geopackageCopy.path)
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  deleteGeoPackageFeatureTableColumn (state, {projectId, geopackageId}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    geopackageCopy.modifiedDate = FileUtilities.getLastModifiedDate(geopackageCopy.path)
    Vue.set(state[projectId].geopackages, geopackageId, geopackageCopy)
  },
  addGeoPackageFeatureTableColumn (state, {projectId, geopackageId}) {
    let geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    geopackageCopy.modifiedDate = FileUtilities.getLastModifiedDate(geopackageCopy.path)
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
    _.keys(projectCopy.sources).forEach(key => {
      const source = projectCopy.sources[key]
      source.visible = false
    })
    Vue.set(state, projectId, projectCopy)
  },
  zoomToExtent (state, {projectId, extent}) {
    let key = 0
    if (!_.isNil(state[projectId].zoomToExtent)) {
      key = (!_.isNil(state[projectId].zoomToExtent.key) ? state[projectId].zoomToExtent.key : 0) + 1
    }
    Vue.set(state[projectId], 'zoomToExtent', {extent, key})
  },
  setBoundingBoxFilter (state, {projectId, boundingBoxFilter}) {
    Vue.set(state[projectId], 'boundingBoxFilter', boundingBoxFilter)
  },
  setBoundingBoxFilterEditingEnabled (state, {projectId, enabled}) {
    Vue.set(state[projectId], 'boundingBoxFilterEditingEnabled', enabled)
  },
  clearBoundingBoxFilter (state, {projectId}) {
    const project = _.cloneDeep(state[projectId])
    project.boundingBoxFilterEditingEnabled = false
    delete project.boundingBoxFilter
    Vue.set(state, projectId, project)
  }
}

const actions = {
  newProject ({ dispatch, commit, state }) {
    let project = {
      id: UniqueIDUtilities.createUniqueID(),
      name: 'New Project',
      sources: {},
      geopackages: {},
      zoomControlEnabled: true,
      displayZoomEnabled: true,
      maxFeatures: 1000,
      boundingBoxFilterEditingEnabled: false,
      boundingBoxFilter: undefined
    }
    commit('UIState/addProjectState', {projectId: project.id}, { root: true })
    commit('pushProjectToProjects', project)
    actions.openProject({ commit, state }, project)
  },
  setProjectName ({ commit, state }, {project, name}) {
    commit('setProjectName', {project, name})
  },
  setDataSourceDisplayName ({ commit, state }, {projectId, sourceId, displayName}) {
    commit('setDataSourceDisplayName', {projectId, sourceId, displayName})
  },
  addDataSources ({ commit }, {dataSources}) {
    commit('addDataSources', {dataSources})
  },
  addGeoPackage ({ commit, state }, {projectId, filePath}) {
    GeoPackageUtilities.getOrCreateGeoPackageForApp(filePath).then(geopackage => {
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
      commit('setGeoPackage', {projectId, geopackage})
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
  renameGeoPackageFeatureTableColumn ({ commit, state }, {projectId, geopackageId, tableName, oldColumnName, newColumnName}) {
    return new Promise((resolve) => {
      return GeoPackageUtilities.renameGeoPackageFeatureTableColumn(state[projectId].geopackages[geopackageId].path, tableName, oldColumnName, newColumnName).then(() => {
        commit('renameGeoPackageFeatureTableColumn', {projectId, geopackageId})
        resolve()
      })
    })
  },
  deleteGeoPackageFeatureTableColumn ({ commit, state }, {projectId, geopackageId, tableName, columnName}) {
    GeoPackageUtilities.deleteGeoPackageFeatureTableColumn(state[projectId].geopackages[geopackageId].path, tableName, columnName).then(() => {
      commit('deleteGeoPackageFeatureTableColumn', {projectId, geopackageId})
    })
  },
  addGeoPackageFeatureTableColumn ({ commit, state }, {projectId, geopackageId, tableName, columnName, columnType}) {
    GeoPackageUtilities.addGeoPackageFeatureTableColumn(state[projectId].geopackages[geopackageId].path, tableName, columnName, columnType).then(() => {
      commit('addGeoPackageFeatureTableColumn', {projectId, geopackageId})
    })
  },
  setDataSourceVisible ({ commit, state }, {projectId, sourceId, visible}) {
    commit('setDataSourceVisible', {projectId, sourceId, visible})
  },
  removeDataSource ({ commit, state }, {projectId, sourceId}) {
    try {
      FileUtilities.rmSourceDirectory(state[projectId].sources[sourceId].sourceId)
    } catch (error) {
      console.error(error)
    }
    commit('removeDataSource', {projectId, sourceId})
  },
  setFeatureStyle ({ commit, state }, {projectId, id, tableName, featureId, styleId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.setFeatureStyle(filePath, tableName, featureId, styleId).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  setFeatureIcon ({ commit, state }, {projectId, id, tableName, featureId, iconId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.setFeatureIcon(filePath, tableName, featureId, iconId).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  setTableStyle ({ commit, state }, {projectId, id, tableName, geometryType, styleId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.setTableStyle(filePath, tableName, geometryType, styleId).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  setTableIcon ({ commit, state }, {projectId, id, tableName, geometryType, iconId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.setTableIcon(filePath, tableName, geometryType, iconId).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  createProjectLayerStyleRow ({ commit, state }, {projectId, id, tableName, isGeoPackage, style}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.createStyleRow(filePath, tableName, style).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  createProjectLayerIconRow ({ commit, state }, {projectId, id, tableName, isGeoPackage, icon}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.createIconRow(filePath, tableName, icon).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  updateProjectLayerStyleRow ({ commit, state }, {projectId, id, tableName, styleRow, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.updateStyleRow(filePath, tableName, styleRow).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  updateProjectLayerIconRow ({ commit, state }, {projectId, id, tableName, iconRow, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.updateIconRow(filePath, tableName, iconRow).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  deleteProjectLayerStyleRow ({ commit, state }, {projectId, id, tableName, styleId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.deleteStyleRow(filePath, tableName, styleId).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  deleteProjectLayerIconRow ({ commit, state }, {projectId, id, tableName, iconId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.deleteIconRow(filePath, tableName, iconId).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  deleteProjectLayerFeatureRow ({ commit, state }, {projectId, id, tableName, featureId, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.deleteFeatureRow(filePath, tableName, featureId).then(function (result) {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  addStyleExtensionForTable ({ commit, state }, {projectId, id, tableName, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.addStyleExtensionForTable(filePath, tableName).then(function () {
      commit('updateStyleKey', {projectId, id, tableName, isGeoPackage})
    })
  },
  removeStyleExtensionForTable ({ commit, state }, {projectId, id, tableName, isGeoPackage}) {
    const filePath = isGeoPackage ? state[projectId].geopackages[id].path : state[projectId].sources[id].geopackageFilePath
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
        existingTable.styleKey = existingTable.styleKey + 1
        commit('setGeoPackage', {projectId, geopackage: geopackageCopy})
      })
    })
  },
  deleteProject ({ commit, state }, project) {
    commit('deleteProject', project)
    commit('UIState/deleteProject', project.id, {root: true})
  },
  openProject ({ commit, state }, project) {
    WindowLauncher.showProject(project.id)
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
  setBoundingBoxFilter ({ commit, state }, {projectId, boundingBoxFilter}) {
    commit('setBoundingBoxFilter', {projectId, boundingBoxFilter})
  },
  setBoundingBoxFilterEditingEnabled ({ commit, state }, {projectId, enabled}) {
    commit('setBoundingBoxFilterEditingEnabled', {projectId, enabled})
  },
  clearBoundingBoxFilter ({ commit, state }, {projectId}) {
    commit('clearBoundingBoxFilter', {projectId})
  },
  synchronizeGeoPackage ({ commit, state }, {projectId, geopackageId}) {
    const geopackageCopy = _.cloneDeep(state[projectId].geopackages[geopackageId])
    GeoPackageUtilities.getOrCreateGeoPackageForApp(geopackageCopy.path).then(geopackage => {
      geopackage.id = geopackageId
      _.keys(geopackage.tables.features).forEach(table => {
        const featureTable = geopackage.tables.features[table]
        const originalTable = geopackageCopy.tables.features[table]
        if (!_.isNil(originalTable)) {
          featureTable.visible = originalTable.visible
        }
      })
      _.keys(geopackage.tables.tiles).forEach(table => {
        const tileTable = geopackage.tables.tiles[table]
        const originalTable = geopackageCopy.tables.tiles[table]
        if (!_.isNil(originalTable)) {
          tileTable.visible = originalTable.visible
        }
      })
      commit('setGeoPackage', {projectId, geopackage})
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
