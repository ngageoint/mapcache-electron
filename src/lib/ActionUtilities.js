import path from 'path'
import jetpack from 'fs-jetpack'
import _ from 'lodash'
import FileUtilities from './FileUtilities'
import GeoPackageUtilities from './GeoPackageUtilities'
import store from '../store'
import Vue from 'vue'
import GarbageCollector from './GarbageCollector'
import LayerFactory from './source/layer/LayerFactory'

/**
 * ActionUtilities is a helper class for performing actions prior to updating the store
 */
export default class ActionUtilities {
  static newProject ({id, name}) {
    store.dispatch('Projects/newProject', {id, name})
  }

  static setDataSource ({projectId, source}) {
    store.dispatch('Projects/setDataSource', {projectId, source})
  }

  static setProjectName ({project, name}) {
    store.dispatch('Projects/setProjectName', {project, name})
  }

  static showToolTips ({projectId, show}) {
    store.dispatch('Projects/showToolTips', {projectId, show})
  }

  static setDataSourceDisplayName ({projectId, sourceId, displayName}) {
    store.dispatch('Projects/setDataSourceDisplayName', {projectId, sourceId, displayName})
  }

  static addDataSources ({dataSources}) {
    store.dispatch('Projects/addDataSources', {dataSources})
  }

  static addGeoPackage ({projectId, filePath}) {
    GeoPackageUtilities.getOrCreateGeoPackageForApp(filePath).then(geopackage => {
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
      ActionUtilities.notifyTab({projectId, tabId: 0})
    })
  }

  static setGeoPackageLayersVisible ({projectId, geopackageId, visible}) {
    const geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    _.keys(geopackage.tables.tiles).forEach(table => {
      geopackage.tables.tiles[table].visible = visible
    })
    _.keys(geopackage.tables.features).forEach(table => {
      geopackage.tables.features[table].visible = visible
    })
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  }

  static setGeoPackageFeatureTableVisible ({projectId, geopackageId, tableName, visible}) {
    const geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    geopackage.tables.features[tableName].visible = visible
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  }

  static setGeoPackageTileTableVisible ({projectId, geopackageId, tableName, visible}) {
    const geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    geopackage.tables.tiles[tableName].visible = visible
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  }

  static _hasVisibleTables (geopackage) {
    let hasVisibleTables = false
    _.keys(geopackage.tables.features).forEach(table => {
      if (geopackage.tables.features[table].visible) {
        hasVisibleTables = true
      }
    })
    _.keys(geopackage.tables.tiles).forEach(table => {
      if (geopackage.tables.tiles[table].visible) {
        hasVisibleTables = true
      }
    })
    return hasVisibleTables
  }

  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static renameGeoPackage ({projectId, geopackageId, name}) {
    return new Promise((resolve, reject) => {
      const geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      GarbageCollector.tryCollect()
      // on the next tick, try to rename
      Vue.nextTick(async () => {
        const oldPath = geopackage.path
        const newName = name + '.gpkg'
        const newPath = path.join(path.dirname(oldPath), newName)
        let renamed = false
        let retryAttempts = 0
        let error
        // try to rename until the max attempts are reached
        while (!renamed && retryAttempts < 5) {
          try {
            await jetpack.renameAsync(oldPath, newName)
            geopackage.path = newPath
            geopackage.name = name
            geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
            renamed = true
          } catch (e) {
            error = e
            await ActionUtilities.sleep(100)
          }
          retryAttempts++
        }
        Vue.nextTick(() => {
          store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
          renamed ? resolve() : reject(error)
        })
      })
    })
  }

  static copyGeoPackage ({projectId, geopackageId, name}) {
    const oldPath = store.state.Projects[projectId].geopackages[geopackageId].path
    const newPath = path.join(path.dirname(oldPath), name + '.gpkg')
    jetpack.copyFileAsync(oldPath, newPath).then(() => {
      GeoPackageUtilities.getOrCreateGeoPackageForApp(newPath).then(geopackage => {
        store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
      })
    }).then(e => {
      // eslint-disable-next-line no-console
      console.error(e)
    })
  }

  static removeGeoPackage ({projectId, geopackageId}) {
    store.dispatch('Projects/removeGeoPackage', {projectId, geopackageId})
  }

  static renameGeoPackageTileTable ({projectId, geopackageId, oldTableName, newTableName}) {
    GeoPackageUtilities.renameGeoPackageTable(store.state.Projects[projectId].geopackages[geopackageId].path, oldTableName, newTableName).then(() => {
      let geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      let table = geopackage.tables.tiles[oldTableName]
      delete geopackage.tables.tiles[oldTableName]
      geopackage.tables.tiles[newTableName] = table
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static copyGeoPackageTileTable ({projectId, geopackageId, tableName, copyTableName}) {
    GeoPackageUtilities.copyGeoPackageTable(store.state.Projects[projectId].geopackages[geopackageId].path, tableName, copyTableName).then(() => {
      let geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      geopackage.tables.tiles[copyTableName] = _.cloneDeep(geopackage.tables.tiles[tableName])
      geopackage.tables.tiles[copyTableName].visible = false
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static deleteGeoPackageTileTable ({projectId, geopackageId, tableName}) {
    GeoPackageUtilities.deleteGeoPackageTable(store.state.Projects[projectId].geopackages[geopackageId].path, tableName).then(() => {
      let geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      delete geopackage.tables.tiles[tableName]
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static renameGeoPackageFeatureTable ({projectId, geopackageId, oldTableName, newTableName}) {
    GeoPackageUtilities.renameGeoPackageTable(store.state.Projects[projectId].geopackages[geopackageId].path, oldTableName, newTableName).then(() => {
      let geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      let table = geopackage.tables.features[oldTableName]
      delete geopackage.tables.features[oldTableName]
      geopackage.tables.features[newTableName] = table
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static copyGeoPackageFeatureTable ({projectId, geopackageId, tableName, copyTableName}) {
    GeoPackageUtilities.copyGeoPackageTable(store.state.Projects[projectId].geopackages[geopackageId].path, tableName, copyTableName).then(() => {
      let geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      geopackage.tables.features[copyTableName] = _.cloneDeep(geopackage.tables.features[tableName])
      geopackage.tables.features[copyTableName].visible = false
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static deleteGeoPackageFeatureTable ({projectId, geopackageId, tableName}) {
    GeoPackageUtilities.deleteGeoPackageTable(store.state.Projects[projectId].geopackages[geopackageId].path, tableName).then(() => {
      let geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      delete geopackage.tables.features[tableName]
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static renameGeoPackageFeatureTableColumn ({projectId, geopackageId, tableName, oldColumnName, newColumnName}) {
    GeoPackageUtilities.renameGeoPackageFeatureTableColumn(store.state.Projects[projectId].geopackages[geopackageId].path, tableName, oldColumnName, newColumnName).then(() => {
      let geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static deleteGeoPackageFeatureTableColumn ({projectId, geopackageId, tableName, columnName}) {
    GeoPackageUtilities.deleteGeoPackageFeatureTableColumn(store.state.Projects[projectId].geopackages[geopackageId].path, tableName, columnName).then(() => {
      let geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static addGeoPackageFeatureTableColumn ({projectId, geopackageId, tableName, columnName, columnType}) {
    GeoPackageUtilities.addGeoPackageFeatureTableColumn(store.state.Projects[projectId].geopackages[geopackageId].path, tableName, columnName, columnType).then(() => {
      let geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static setDataSourceVisible ({projectId, sourceId, visible}) {
    store.dispatch('Projects/setDataSourceVisible', {projectId, sourceId, visible})
  }

  static removeDataSource ({projectId, sourceId}) {
    try {
      FileUtilities.rmSourceDirectory(store.state.Projects[projectId].sources[sourceId].sourceId)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
    store.dispatch('Projects/removeDataSource', {projectId, sourceId})
  }

  static getGeoPackageFilePath (id, projectId, isGeoPackage, isBaseMap) {
    let filePath
    if (isGeoPackage) {
      filePath = store.state.Projects[projectId].geopackages[id].path
    } else if (isBaseMap) {
      filePath = store.state.BaseMaps.baseMaps.find(baseMap => baseMap.id === id).layerConfiguration.geopackageFilePath
    } else {
      filePath = store.state.Projects[projectId].sources[id].geopackageFilePath
    }
    return filePath
  }

  static setFeatureStyle ({projectId, id, tableName, featureId, styleId, isGeoPackage, isBaseMap}) {

    const filePath = ActionUtilities.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageUtilities.setFeatureStyle(filePath, tableName, featureId, styleId).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static setFeatureIcon ({projectId, id, tableName, featureId, iconId, isGeoPackage, isBaseMap}) {
    const filePath = ActionUtilities.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageUtilities.setFeatureIcon(filePath, tableName, featureId, iconId).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static setTableStyle ({projectId, id, tableName, geometryType, styleId, isGeoPackage, isBaseMap}) {
    const filePath = ActionUtilities.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageUtilities.setTableStyle(filePath, tableName, geometryType, styleId).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static setTableIcon ({projectId, id, tableName, geometryType, iconId, isGeoPackage, isBaseMap}) {
    const filePath = ActionUtilities.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageUtilities.setTableIcon(filePath, tableName, geometryType, iconId).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static createStyleRow ({projectId, id, tableName, isGeoPackage, style, isBaseMap}) {
    const filePath = ActionUtilities.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageUtilities.createStyleRow(filePath, tableName, style).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static createIconRow ({projectId, id, tableName, isGeoPackage, icon, isBaseMap}) {
    const filePath = ActionUtilities.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageUtilities.createIconRow(filePath, tableName, icon).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static updateStyleRow ({projectId, id, tableName, styleRow, isGeoPackage, isBaseMap}) {
    const filePath = ActionUtilities.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageUtilities.updateStyleRow(filePath, tableName, styleRow).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static updateIconRow ({projectId, id, tableName, iconRow, isGeoPackage, isBaseMap}) {
    const filePath = ActionUtilities.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageUtilities.updateIconRow(filePath, tableName, iconRow).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static deleteStyleRow ({projectId, id, tableName, styleId, isGeoPackage, isBaseMap}) {
    const filePath = ActionUtilities.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageUtilities.deleteStyleRow(filePath, tableName, styleId).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static deleteIconRow ({projectId, id, tableName, iconId, isGeoPackage, isBaseMap}) {
    const filePath = ActionUtilities.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageUtilities.deleteIconRow(filePath, tableName, iconId).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static addStyleExtensionForTable ({projectId, id, tableName, isGeoPackage, isBaseMap}) {
    const filePath = ActionUtilities.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageUtilities.addStyleExtensionForTable(filePath, tableName).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static removeStyleExtensionForTable ({projectId, id, tableName, isGeoPackage, isBaseMap}) {
    const filePath = ActionUtilities.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageUtilities.removeStyleExtensionForTable(filePath, tableName).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static addFeatureTableToGeoPackage ({projectId, geopackageId, tableName, featureCollection}) {
    const geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    const filePath = geopackage.path
    GeoPackageUtilities.createFeatureTable(filePath, tableName, featureCollection).then(function () {
      GeoPackageUtilities.getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
        geopackage.size = GeoPackageUtilities.getGeoPackageFileSize(filePath)
        geopackage.tables.features[tableName] = _.cloneDeep(tableInfo)
        geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
        store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
      })
    })
  }

  static updateFeatureGeometry ({projectId, id, isGeoPackage, tableName, featureGeoJson, isBaseMap}) {
    const filePath = ActionUtilities.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageUtilities.updateFeatureGeometry(filePath, tableName, featureGeoJson).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static addFeatureToGeoPackage ({projectId, geopackageId, tableName, feature}) {
    const geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    const existingTable = geopackage.tables.features[tableName]
    const filePath = store.state.Projects[projectId].geopackages[geopackageId].path
    GeoPackageUtilities.addFeatureToFeatureTable(filePath, tableName, feature).then(function () {
      GeoPackageUtilities.getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
        geopackage.size = GeoPackageUtilities.getGeoPackageFileSize(filePath)
        existingTable.featureCount = tableInfo.featureCount
        existingTable.description = tableInfo.description
        existingTable.styleKey = existingTable.styleKey + 1
        existingTable.indexed = tableInfo.indexed
        geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
        store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
      })
    })
  }

  static updateFeatureTable ({projectId, geopackageId, tableName}) {
    const geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    const existingTable = geopackage.tables.features[tableName]
    const filePath = store.state.Projects[projectId].geopackages[geopackageId].path
    GeoPackageUtilities.getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
      geopackage.size = GeoPackageUtilities.getGeoPackageFileSize(filePath)
      existingTable.featureCount = tableInfo.featureCount
      existingTable.description = tableInfo.description
      existingTable.styleKey = existingTable.styleKey + 1
      existingTable.indexed = tableInfo.indexed
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static removeFeatureFromGeopackage ({projectId, geopackageId, tableName, featureId}) {
    const geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    const existingTable = geopackage.tables.features[tableName]
    const filePath = store.state.Projects[projectId].geopackages[geopackageId].path
    GeoPackageUtilities.deleteFeatureRow(filePath, tableName, featureId).then(function () {
      GeoPackageUtilities.getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
        geopackage.size = GeoPackageUtilities.getGeoPackageFileSize(filePath)
        existingTable.featureCount = tableInfo.featureCount
        existingTable.description = tableInfo.description
        existingTable.styleKey = existingTable.styleKey + 1
        geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
        store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
      })
    })
  }

  static removeFeatureFromDataSource ({projectId, sourceId, featureId}) {
    const sourceCopy = _.cloneDeep(store.state.Projects[projectId].sources[sourceId])
    const filePath = sourceCopy.geopackageFilePath
    GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      GeoPackageUtilities._deleteFeatureRow(gp, sourceCopy.sourceLayerName, featureId)
      sourceCopy.extent = GeoPackageUtilities._getBoundingBoxForTable(gp, sourceCopy.sourceLayerName)
      sourceCopy.count = gp.getFeatureDao(sourceCopy.sourceLayerName).count()
      store.dispatch('Projects/setDataSource', {projectId, source: sourceCopy})
    })
  }

  static deleteProject (project) {
    _.keys(store.state.Projects[project.id].sources).forEach(sourceId => {
      try {
        FileUtilities.rmSourceDirectory(store.state.Projects[project.id].sources[sourceId].sourceId)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
      }
    })
    store.dispatch('UIState/deleteProject', { projectId: project.id.slice() })
    store.dispatch('Projects/deleteProject', { projectId: project.id.slice() })
  }

  static setProjectMaxFeatures ({projectId, maxFeatures}) {
    store.dispatch('Projects/setProjectMaxFeatures', {projectId, maxFeatures})
  }

  static setZoomControlEnabled ({projectId, enabled}) {
    store.dispatch('Projects/setZoomControlEnabled', {projectId, enabled})
  }

  static setDisplayZoomEnabled ({projectId, enabled}) {
    store.dispatch('Projects/setDisplayZoomEnabled', {projectId, enabled})
  }

  static setDisplayAddressSearchBar ({projectId, enabled}) {
    store.dispatch('Projects/setDisplayAddressSearchBar', {projectId, enabled})
  }

  static clearActiveLayers ({projectId}) {
    store.dispatch('Projects/clearActiveLayers', {projectId})
  }

  static zoomToExtent ({projectId, extent}) {
    store.dispatch('Projects/zoomToExtent', {projectId, extent})
  }

  static setBoundingBoxFilter ({projectId, boundingBoxFilter}) {
    store.dispatch('Projects/setBoundingBoxFilter', {projectId, boundingBoxFilter})
  }

  static async setBoundingBoxFilterToExtent (projectId) {
    let overallExtent = null
    try {
      let keys = Object.keys(store.state.Projects[projectId].geopackages)
      for (let i = 0; i < keys.length; i++) {
        const geopackageId = keys[i]
        const geopackage = store.state.Projects[projectId].geopackages[geopackageId]
        const tablesToZoomTo = _.keys(geopackage.tables.features).filter(table => geopackage.tables.features[table].visible).concat(_.keys(geopackage.tables.tiles).filter(table => geopackage.tables.tiles[table].visible))
        const extentForGeoPackage = await GeoPackageUtilities.performSafeGeoPackageOperation(geopackage.path, function (gp) {
          let extent = null
          tablesToZoomTo.forEach(table => {
            const ext = GeoPackageUtilities._getBoundingBoxForTable(gp, table)
            if (!_.isNil(ext)) {
              if (_.isNil(extent)) {
                extent = ext
              } else {
                if (ext[0] < extent[0]) {
                  extent[0] = ext[0]
                }
                if (ext[1] < extent[1]) {
                  extent[1] = ext[1]
                }
                if (ext[2] > extent[2]) {
                  extent[2] = ext[2]
                }
                if (ext[3] > extent[3]) {
                  extent[3] = ext[3]
                }
              }
            }
          })
          return extent
        })
        if (!_.isNil(extentForGeoPackage)) {
          if (_.isNil(overallExtent)) {
            overallExtent = extentForGeoPackage
          } else {
            if (extentForGeoPackage[0] < overallExtent[0]) {
              overallExtent[0] = extentForGeoPackage[0]
            }
            if (extentForGeoPackage[1] < overallExtent[1]) {
              overallExtent[1] = extentForGeoPackage[1]
            }
            if (extentForGeoPackage[2] > overallExtent[2]) {
              overallExtent[2] = extentForGeoPackage[2]
            }
            if (extentForGeoPackage[3] > overallExtent[3]) {
              overallExtent[3] = extentForGeoPackage[3]
            }
          }
        }
      }
      keys = Object.keys(store.state.Projects[projectId].sources).filter(key => store.state.Projects[projectId].sources[key].visible)
      for (let i = 0; i < keys.length; i++) {
        const layerExtent = store.state.Projects[projectId].sources[keys[i]].extent
        if (!_.isNil(layerExtent)) {
          if (_.isNil(overallExtent)) {
            overallExtent = layerExtent
          } else {
            if (layerExtent[0] < overallExtent[0]) {
              overallExtent[0] = layerExtent[0]
            }
            if (layerExtent[1] < overallExtent[1]) {
              overallExtent[1] = layerExtent[1]
            }
            if (layerExtent[2] > overallExtent[2]) {
              overallExtent[2] = layerExtent[2]
            }
            if (layerExtent[3] > overallExtent[3]) {
              overallExtent[3] = layerExtent[3]
            }
          }
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
    store.dispatch('Projects/setBoundingBoxFilter', {projectId, boundingBoxFilter: overallExtent})
  }

  static setBoundingBoxFilterEditingEnabled ({projectId, mode}) {
    store.dispatch('Projects/setBoundingBoxFilterEditingEnabled', {projectId, mode})
  }

  static setBoundingBoxFilterEditingDisabled ({projectId}) {
    store.dispatch('Projects/setBoundingBoxFilterEditingDisabled', {projectId})
  }

  static clearBoundingBoxFilter ({projectId}) {
    store.dispatch('Projects/clearBoundingBoxFilter', {projectId})
  }

  /**
   * Will synchronize the geopackage with what is on the file system. Then it will update the store
   * @param projectId
   * @param geopackageId
   */
  static synchronizeGeoPackage ({projectId, geopackageId}) {
    const geopackageCopy = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
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
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static synchronizeDataSource ({projectId, sourceId}) {
    const sourceCopy = _.cloneDeep(store.state.Projects[projectId].sources[sourceId])
    const filePath = sourceCopy.geopackageFilePath
    GeoPackageUtilities.performSafeGeoPackageOperation(filePath, (gp) => {
      sourceCopy.extent = GeoPackageUtilities._getBoundingBoxForTable(gp, sourceCopy.sourceLayerName)
      sourceCopy.count = gp.getFeatureDao(sourceCopy.sourceLayerName).count()
      store.dispatch('Projects/setDataSource', {projectId, source: sourceCopy})
    })
  }

  static setActiveGeoPackage ({projectId, geopackageId}) {
    store.dispatch('Projects/setActiveGeoPackage', {projectId, geopackageId})
  }

  static setActiveGeoPackageFeatureLayer ({projectId, geopackageId, tableName}) {
    if (!_.isNil(projectId)) {
      store.dispatch('Projects/setActiveGeoPackageFeatureLayer', {projectId, geopackageId, tableName})
    }
  }

  static updateStyleKey (projectId, id, tableName, isGeoPackage, isBaseMap = false) {
    if (isGeoPackage) {
      const geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[id])
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      if (geopackage.tables.features[tableName]) {
        geopackage.tables.features[tableName].styleKey = geopackage.tables.features[tableName].styleKey + 1
      } else if (geopackage.tables.tiles[tableName]) {
        geopackage.tables.tiles[tableName].styleKey = geopackage.tables.tiles[tableName].styleKey + 1
      }
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    } else if (isBaseMap) {
      const baseMap = _.cloneDeep(store.state.BaseMaps.baseMaps.find(baseMap => baseMap.id === id))
      baseMap.layerConfiguration.styleKey = baseMap.layerConfiguration.styleKey + 1
      store.dispatch('BaseMaps/editBaseMap', baseMap)
    } else {
      const source = _.cloneDeep(store.state.Projects[projectId].sources[id])
      source.styleKey = source.styleKey + 1
      store.dispatch('Projects/setDataSource', {projectId, source})
    }
  }

  static setDarkTheme ({projectId, enabled}) {
    store.dispatch('UIState/setDarkTheme', {projectId, enabled})
  }

  static notifyTab ({projectId, tabId}) {
    store.dispatch('UIState/notifyTab', {projectId, tabId})
  }

  static clearNotification ({projectId, tabId}) {
    store.dispatch('UIState/clearNotification', {projectId, tabId})
  }

  static clearNotifications ({projectId}) {
    store.dispatch('UIState/clearNotifications', {projectId})
  }

  static setMapZoom ({projectId, mapZoom}) {
    store.dispatch('UIState/setMapZoom', {projectId, mapZoom})
  }

  /**
   * Edits a feature's geometry on the map
   * @param projectId
   * @param id
   * @param isGeoPackage
   * @param tableName
   * @param featureToEdit
   */
  static editFeatureGeometry ({projectId, id, isGeoPackage, tableName, featureToEdit}) {
    if (!_.isNil(projectId)) {
      store.dispatch('Projects/editFeatureGeometry', {projectId, id, isGeoPackage, tableName, featureToEdit})
    }
  }

  /**
   * Will cancel the editing of that feature
   * This should only be called if the feature is successfully edited, deleted or if it's source is deleted.
   * @param projectId
   */
  static clearEditFeatureGeometry ({projectId}) {
    if (!_.isNil(projectId)) {
      store.dispatch('Projects/clearEditFeatureGeometry', {projectId})
    }
  }

  /**
   * Sets the rendering order of the map
   * @param projectId
   * @param renderingOrder
   */
  static setMapRenderingOrder ({projectId, mapRenderingOrder}) {
    store.dispatch('Projects/setMapRenderingOrder', {projectId, mapRenderingOrder})
  }

  /**
   * Sets the preview layer when adding URL data source
   * @param projectId
   * @param previewLayer
   */
  static setPreviewLayer ({projectId, previewLayer}) {
    store.dispatch('UIState/setPreviewLayer', {projectId, previewLayer})
  }

  /**
   * Sets the preview layer when adding URL data source
   * @param projectId
   */
  static clearPreviewLayer ({projectId}) {
    store.dispatch('UIState/clearPreviewLayer', {projectId})
  }

  /**
   * Adds a base map to the application
   * @param baseMapName
   * @param configuration
   * @param backgroundColor
   */
  static async addBaseMap (baseMapName, configuration, backgroundColor) {
    let layerConfiguration = {}

    // create new directory
    const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()

    // handle geopackage
    let extent = [-180, -90, 180, 90]
    if (!_.isNil(configuration.geopackage)) {
      const oldPath = configuration.geopackage.path
      const newPath = path.join(sourceDirectory, path.basename(oldPath))
      await jetpack.copyAsync(oldPath, newPath)
      if (configuration.type === 'tile') {
        // create new geopackage and copy tile table
        const layer = LayerFactory.constructLayer({id: sourceId, filePath: newPath, sourceLayerName: configuration.tableName, layerType: 'GeoPackage'})
        await layer.initialize()
        layerConfiguration = layer.configuration
        extent = await GeoPackageUtilities.getGeoPackageExtent(newPath, configuration.tableName)
      } else {
        // create new geopackage and copy feature table
        const layer = LayerFactory.constructLayer({id: sourceId, geopackageFilePath: newPath, sourceDirectory: newPath, sourceLayerName: configuration.tableName, sourceType: 'GeoPackage', layerType: 'Vector', maxFeatures: configuration.maxFeatures})
        await layer.initialize()
        layerConfiguration = layer.configuration
        extent = await GeoPackageUtilities.getBoundingBoxForTable(newPath, configuration.tableName)
      }
    } else {
      layerConfiguration = _.cloneDeep(configuration)
      extent = layerConfiguration.extent || [-180, -90, 180, 90]
      if (!_.isNil(configuration.geopackageFilePath)) {
        const newFilePath = path.join(sourceDirectory, path.basename(layerConfiguration.geopackageFilePath))
        await jetpack.copyAsync(layerConfiguration.geopackageFilePath, newFilePath)
        layerConfiguration.geopackageFilePath = newFilePath
        extent = await GeoPackageUtilities.getBoundingBoxForTable(newFilePath, configuration.sourceLayerName)
      } else if (FileUtilities.exists(layerConfiguration.filePath)) {
        // if valid filePath, copy to new location
        const newFilePath = path.join(sourceDirectory, path.basename(layerConfiguration.filePath))
        await jetpack.copyAsync(layerConfiguration.filePath, newFilePath)
        layerConfiguration.filePath = newFilePath
      }
    }
    layerConfiguration.id = sourceId
    store.dispatch('BaseMaps/addBaseMap', {
      id: sourceId,
      name: baseMapName,
      background: backgroundColor,
      readonly: false,
      layerConfiguration: layerConfiguration,
      extent: extent
    })
  }

  static editBaseMap (baseMap) {
    store.dispatch('BaseMaps/editBaseMap', baseMap)
  }

  static removeBaseMap (baseMap) {
    try {
      FileUtilities.rmSourceDirectory(baseMap.id)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
    store.dispatch('BaseMaps/removeBaseMap', baseMap.id)
  }

  /**
   * this attempts to apply the error to the source
   * @param id
   * @param error
   */
  static setSourceError ({id, error}) {
    // search basemaps for matching id and assign error
    const baseMap = store.state.BaseMaps.baseMaps.find(baseMap => baseMap.id === id)
    if (!_.isNil(baseMap)) {
      const baseMapCopy = _.cloneDeep(baseMap)
      baseMapCopy.error = error
      store.dispatch('BaseMaps/editBaseMap', baseMapCopy)
    }

    // search sources for matching id and assign error
    const projectKeys = _.keys(store.state.Projects)
    for (let i = 0; i < projectKeys.length; i++) {
      const projectId = projectKeys[i]
      const sourceId = _.keys(store.state.Projects[projectId].sources).find(sourceId => sourceId === id)
      if (!_.isNil(sourceId)) {
        const source = _.cloneDeep(store.state.Projects[projectId].sources[sourceId])
        source.error = error
        source.visible = false
        store.dispatch('Projects/setDataSource', {projectId, source})
        break
      }
    }
  }

  static saveConnectionSettings (projectId, sourceId, timeoutMs, rateLimit, retryAttempts) {
    const source = _.cloneDeep(store.state.Projects[projectId].sources[sourceId])
    source.timeoutMs = timeoutMs
    source.rateLimit = rateLimit
    source.retryAttempts = retryAttempts
    store.dispatch('Projects/setDataSource', {projectId, source})
  }

  static saveBaseMapConnectionSettings (id, timeoutMs, rateLimit, retryAttempts) {
    const baseMap = store.state.BaseMaps.baseMaps.find(baseMap => baseMap.id === id)
    if (!_.isNil(baseMap)) {
      const baseMapCopy = _.cloneDeep(baseMap)
      baseMapCopy.layerConfiguration.timeoutMs = timeoutMs
      baseMapCopy.layerConfiguration.rateLimit = rateLimit
      baseMapCopy.layerConfiguration.retryAttempts = retryAttempts
      store.dispatch('BaseMaps/editBaseMap', baseMapCopy)
    }
  }
}
