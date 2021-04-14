import path from 'path'
import jetpack from 'fs-jetpack'
import isNil from 'lodash/isNil'
import keys from 'lodash/keys'
import cloneDeep from 'lodash/cloneDeep'
import FileUtilities from '../util/FileUtilities'
import store from '../../store'
import Vue from 'vue'
import GarbageCollector from '../util/GarbageCollector'
import GeoPackageCommon from '../geopackage/GeoPackageCommon'
import GeoPackageFeatureTableUtilities from '../geopackage/GeoPackageFeatureTableUtilities'
import GeoPackageStyleUtilities from '../geopackage/GeoPackageStyleUtilities'

/**
 * ProjectActions is a helper class for performing actions prior to updating the store
 */
export default class ProjectActions {

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

  static addDataSources ({projectId, dataSources}) {
    store.dispatch('Projects/addDataSources', {projectId, dataSources})
  }

  static addGeoPackage ({projectId, filePath}) {
    GeoPackageCommon.getOrCreateGeoPackageForApp(filePath).then(geopackage => {
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
      ProjectActions.notifyTab({projectId, tabId: 0})
    })
  }

  static setGeoPackageLayersVisible ({projectId, geopackageId, visible}) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    keys(geopackage.tables.tiles).forEach(table => {
      geopackage.tables.tiles[table].visible = visible
    })
    keys(geopackage.tables.features).forEach(table => {
      geopackage.tables.features[table].visible = visible
    })
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  }

  static setGeoPackageFeatureTableVisible ({projectId, geopackageId, tableName, visible}) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    geopackage.tables.features[tableName].visible = visible
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  }

  static setGeoPackageTileTableVisible ({projectId, geopackageId, tableName, visible}) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    geopackage.tables.tiles[tableName].visible = visible
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  }

  static _hasVisibleTables (geopackage) {
    let hasVisibleTables = false
    keys(geopackage.tables.features).forEach(table => {
      if (geopackage.tables.features[table].visible) {
        hasVisibleTables = true
      }
    })
    keys(geopackage.tables.tiles).forEach(table => {
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
      const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
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
            await ProjectActions.sleep(100)
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

  static removeGeoPackage ({projectId, geopackageId}) {
    store.dispatch('Projects/removeGeoPackage', {projectId, geopackageId})
  }

  static renameGeoPackageTileTable ({projectId, geopackageId, oldTableName, newTableName}) {
    GeoPackageCommon.renameGeoPackageTable(store.state.Projects[projectId].geopackages[geopackageId].path, oldTableName, newTableName).then(() => {
      let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      let table = geopackage.tables.tiles[oldTableName]
      delete geopackage.tables.tiles[oldTableName]
      geopackage.tables.tiles[newTableName] = table
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static copyGeoPackageTileTable ({projectId, geopackageId, tableName, copyTableName}) {
    GeoPackageCommon.copyGeoPackageTable(store.state.Projects[projectId].geopackages[geopackageId].path, tableName, copyTableName).then(() => {
      let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      geopackage.tables.tiles[copyTableName] = cloneDeep(geopackage.tables.tiles[tableName])
      geopackage.tables.tiles[copyTableName].visible = false
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static deleteGeoPackageTileTable ({projectId, geopackageId, tableName}) {
    GeoPackageCommon.deleteGeoPackageTable(store.state.Projects[projectId].geopackages[geopackageId].path, tableName).then(() => {
      let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      delete geopackage.tables.tiles[tableName]
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static renameGeoPackageFeatureTable ({projectId, geopackageId, oldTableName, newTableName}) {
    GeoPackageCommon.renameGeoPackageTable(store.state.Projects[projectId].geopackages[geopackageId].path, oldTableName, newTableName).then(() => {
      let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      let table = geopackage.tables.features[oldTableName]
      delete geopackage.tables.features[oldTableName]
      geopackage.tables.features[newTableName] = table
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static copyGeoPackageFeatureTable ({projectId, geopackageId, tableName, copyTableName}) {
    GeoPackageCommon.copyGeoPackageTable(store.state.Projects[projectId].geopackages[geopackageId].path, tableName, copyTableName).then(() => {
      let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      geopackage.tables.features[copyTableName] = cloneDeep(geopackage.tables.features[tableName])
      geopackage.tables.features[copyTableName].visible = false
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static deleteGeoPackageFeatureTable ({projectId, geopackageId, tableName}) {
    GeoPackageCommon.deleteGeoPackageTable(store.state.Projects[projectId].geopackages[geopackageId].path, tableName).then(() => {
      let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      delete geopackage.tables.features[tableName]
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static renameGeoPackageFeatureTableColumn ({projectId, geopackageId, tableName, oldColumnName, newColumnName}) {
    GeoPackageFeatureTableUtilities.renameGeoPackageFeatureTableColumn(store.state.Projects[projectId].geopackages[geopackageId].path, tableName, oldColumnName, newColumnName).then(() => {
      let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static deleteGeoPackageFeatureTableColumn ({projectId, geopackageId, tableName, columnName}) {
    GeoPackageFeatureTableUtilities.deleteGeoPackageFeatureTableColumn(store.state.Projects[projectId].geopackages[geopackageId].path, tableName, columnName).then(() => {
      let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static addGeoPackageFeatureTableColumn ({projectId, geopackageId, tableName, columnName, columnType}) {
    GeoPackageFeatureTableUtilities.addGeoPackageFeatureTableColumn(store.state.Projects[projectId].geopackages[geopackageId].path, tableName, columnName, columnType).then(() => {
      let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static removeDataSource ({projectId, sourceId}) {
    try {
      const source = store.state.Projects[projectId].sources[sourceId]
      if (!isNil(source.directory)) {
        FileUtilities.rmDir(source.directory)
      }
      if (!isNil(source.sourceDirectory) && FileUtilities.exists(source.sourceDirectory) && FileUtilities.isDirEmpty(source.sourceDirectory)) {
        FileUtilities.rmDir(source.sourceDirectory)
      }
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to remove data source.')
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

    const filePath = ProjectActions.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageStyleUtilities.setFeatureStyle(filePath, tableName, featureId, styleId).then(function () {
      ProjectActions.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static setFeatureIcon ({projectId, id, tableName, featureId, iconId, isGeoPackage, isBaseMap}) {
    const filePath = ProjectActions.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageStyleUtilities.setFeatureIcon(filePath, tableName, featureId, iconId).then(function () {
      ProjectActions.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static setTableStyle ({projectId, id, tableName, geometryType, styleId, isGeoPackage, isBaseMap}) {
    const filePath = ProjectActions.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageStyleUtilities.setTableStyle(filePath, tableName, geometryType, styleId).then(function () {
      ProjectActions.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static setTableIcon ({projectId, id, tableName, geometryType, iconId, isGeoPackage, isBaseMap}) {
    const filePath = ProjectActions.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageStyleUtilities.setTableIcon(filePath, tableName, geometryType, iconId).then(function () {
      ProjectActions.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static createStyleRow ({projectId, id, tableName, isGeoPackage, style, isBaseMap}) {
    const filePath = ProjectActions.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageStyleUtilities.createStyleRow(filePath, tableName, style).then(function () {
      ProjectActions.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static createIconRow ({projectId, id, tableName, isGeoPackage, icon, isBaseMap}) {
    const filePath = ProjectActions.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageStyleUtilities.createIconRow(filePath, tableName, icon).then(function () {
      ProjectActions.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static updateStyleRow ({projectId, id, tableName, styleRow, isGeoPackage, isBaseMap}) {
    const filePath = ProjectActions.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageStyleUtilities.updateStyleRow(filePath, tableName, styleRow).then(function () {
      ProjectActions.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static updateIconRow ({projectId, id, tableName, iconRow, isGeoPackage, isBaseMap}) {
    const filePath = ProjectActions.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageStyleUtilities.updateIconRow(filePath, tableName, iconRow).then(function () {
      ProjectActions.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static deleteStyleRow ({projectId, id, tableName, styleId, isGeoPackage, isBaseMap}) {
    const filePath = ProjectActions.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageStyleUtilities.deleteStyleRow(filePath, tableName, styleId).then(function () {
      ProjectActions.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static deleteIconRow ({projectId, id, tableName, iconId, isGeoPackage, isBaseMap}) {
    const filePath = ProjectActions.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageStyleUtilities.deleteIconRow(filePath, tableName, iconId).then(function () {
      ProjectActions.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static addStyleExtensionForTable ({projectId, id, tableName, isGeoPackage, isBaseMap}) {
    const filePath = ProjectActions.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageStyleUtilities.addStyleExtensionForTable(filePath, tableName).then(function () {
      ProjectActions.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static removeStyleExtensionForTable ({projectId, id, tableName, isGeoPackage, isBaseMap}) {
    const filePath = ProjectActions.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageStyleUtilities.removeStyleExtensionForTable(filePath, tableName).then(function () {
      ProjectActions.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static addFeatureTableToGeoPackage ({projectId, geopackageId, tableName, featureCollection}) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    const filePath = geopackage.path
    GeoPackageFeatureTableUtilities.createFeatureTable(filePath, tableName, featureCollection).then(function () {
      GeoPackageCommon.getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
        geopackage.size = GeoPackageCommon.getGeoPackageFileSize(filePath)
        geopackage.tables.features[tableName] = cloneDeep(tableInfo)
        geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
        store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
      })
    })
  }

  static updateFeatureGeometry ({projectId, id, isGeoPackage, tableName, featureGeoJson, isBaseMap}) {
    const filePath = ProjectActions.getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
    GeoPackageFeatureTableUtilities.updateFeatureGeometry(filePath, tableName, featureGeoJson).then(function () {
      ProjectActions.updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
    })
  }

  static addFeatureToGeoPackage ({projectId, geopackageId, tableName, feature}) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    const existingTable = geopackage.tables.features[tableName]
    const filePath = store.state.Projects[projectId].geopackages[geopackageId].path
    GeoPackageFeatureTableUtilities.addFeatureToFeatureTable(filePath, tableName, feature).then(function () {
      GeoPackageCommon.getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
        geopackage.size = GeoPackageCommon.getGeoPackageFileSize(filePath)
        existingTable.featureCount = tableInfo.featureCount
        existingTable.extent = tableInfo.extent
        existingTable.description = tableInfo.description
        existingTable.styleKey = existingTable.styleKey + 1
        existingTable.indexed = tableInfo.indexed
        geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
        store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
      })
    })
  }

  static updateFeatureTable ({projectId, geopackageId, tableName}) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    const existingTable = geopackage.tables.features[tableName]
    const filePath = store.state.Projects[projectId].geopackages[geopackageId].path
    GeoPackageCommon.getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
      geopackage.size = GeoPackageCommon.getGeoPackageFileSize(filePath)
      existingTable.featureCount = tableInfo.featureCount
      existingTable.extent = tableInfo.extent
      existingTable.description = tableInfo.description
      existingTable.styleKey = existingTable.styleKey + 1
      existingTable.indexed = tableInfo.indexed
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static removeFeatureFromGeopackage ({projectId, geopackageId, tableName, featureId}) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    const existingTable = geopackage.tables.features[tableName]
    const filePath = store.state.Projects[projectId].geopackages[geopackageId].path
    GeoPackageFeatureTableUtilities.deleteFeatureRow(filePath, tableName, featureId).then(function () {
      GeoPackageCommon.getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
        geopackage.size = GeoPackageCommon.getGeoPackageFileSize(filePath)
        existingTable.featureCount = tableInfo.featureCount
        existingTable.extent = tableInfo.extent
        existingTable.description = tableInfo.description
        existingTable.styleKey = existingTable.styleKey + 1
        geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
        store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
      })
    })
  }

  static removeFeatureFromDataSource ({projectId, sourceId, featureId}) {
    const sourceCopy = cloneDeep(store.state.Projects[projectId].sources[sourceId])
    const filePath = sourceCopy.geopackageFilePath
    GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      GeoPackageFeatureTableUtilities._deleteFeatureRow(gp, sourceCopy.sourceLayerName, featureId)
      sourceCopy.extent = GeoPackageCommon._getBoundingBoxForTable(gp, sourceCopy.sourceLayerName)
      sourceCopy.count = gp.getFeatureDao(sourceCopy.sourceLayerName).count()
      store.dispatch('Projects/setDataSource', {projectId, source: sourceCopy})
    })
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
      let geopackageKeys = keys(store.state.Projects[projectId].geopackages)
      for (let i = 0; i < geopackageKeys.length; i++) {
        const geopackageId = geopackageKeys[i]
        const geopackage = store.state.Projects[projectId].geopackages[geopackageId]
        const tablesToZoomTo = keys(geopackage.tables.features).filter(table => geopackage.tables.features[table].visible).concat(keys(geopackage.tables.tiles).filter(table => geopackage.tables.tiles[table].visible))
        const extentForGeoPackage = await GeoPackageCommon.performSafeGeoPackageOperation(geopackage.path, function (gp) {
          let extent = null
          tablesToZoomTo.forEach(table => {
            const ext = GeoPackageCommon._getBoundingBoxForTable(gp, table)
            if (!isNil(ext)) {
              if (isNil(extent)) {
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
        if (!isNil(extentForGeoPackage)) {
          if (isNil(overallExtent)) {
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
      const visibleSourceKeys = keys(store.state.Projects[projectId].sources).filter(key => store.state.Projects[projectId].sources[key].visible)
      for (let i = 0; i < visibleSourceKeys.length; i++) {
        const layerExtent = store.state.Projects[projectId].sources[visibleSourceKeys[i]].extent
        if (!isNil(layerExtent)) {
          if (isNil(overallExtent)) {
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
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to determine overall extent.')
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
    const geopackageCopy = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    GeoPackageCommon.getOrCreateGeoPackageForApp(geopackageCopy.path).then(geopackage => {
      geopackage.id = geopackageId
      keys(geopackage.tables.features).forEach(table => {
        const featureTable = geopackage.tables.features[table]
        const originalTable = geopackageCopy.tables.features[table]
        if (!isNil(originalTable)) {
          featureTable.visible = originalTable.visible
        }
      })
      keys(geopackage.tables.tiles).forEach(table => {
        const tileTable = geopackage.tables.tiles[table]
        const originalTable = geopackageCopy.tables.tiles[table]
        if (!isNil(originalTable)) {
          tileTable.visible = originalTable.visible
        }
      })
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    })
  }

  static synchronizeDataSource ({projectId, sourceId}) {
    const sourceCopy = cloneDeep(store.state.Projects[projectId].sources[sourceId])
    const filePath = sourceCopy.geopackageFilePath
    GeoPackageCommon.performSafeGeoPackageOperation(filePath, (gp) => {
      sourceCopy.extent = GeoPackageCommon._getBoundingBoxForTable(gp, sourceCopy.sourceLayerName)
      sourceCopy.count = gp.getFeatureDao(sourceCopy.sourceLayerName).count()
      store.dispatch('Projects/setDataSource', {projectId, source: sourceCopy})
    })
  }

  static setActiveGeoPackage ({projectId, geopackageId}) {
    store.dispatch('Projects/setActiveGeoPackage', {projectId, geopackageId})
  }

  static setActiveGeoPackageFeatureLayer ({projectId, geopackageId, tableName}) {
    if (!isNil(projectId)) {
      store.dispatch('Projects/setActiveGeoPackageFeatureLayer', {projectId, geopackageId, tableName})
    }
  }

  static updateStyleKey (projectId, id, tableName, isGeoPackage, isBaseMap = false) {
    if (isGeoPackage) {
      const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[id])
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      if (geopackage.tables.features[tableName]) {
        geopackage.tables.features[tableName].styleKey = geopackage.tables.features[tableName].styleKey + 1
      } else if (geopackage.tables.tiles[tableName]) {
        geopackage.tables.tiles[tableName].styleKey = geopackage.tables.tiles[tableName].styleKey + 1
      }
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    } else if (isBaseMap) {
      const baseMap = cloneDeep(store.state.BaseMaps.baseMaps.find(baseMap => baseMap.id === id))
      baseMap.layerConfiguration.styleKey = baseMap.layerConfiguration.styleKey + 1
      store.dispatch('BaseMaps/editBaseMap', baseMap)
    } else {
      const source = cloneDeep(store.state.Projects[projectId].sources[id])
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
    if (!isNil(projectId)) {
      store.dispatch('Projects/editFeatureGeometry', {projectId, id, isGeoPackage, tableName, featureToEdit})
    }
  }

  /**
   * Will cancel the editing of that feature
   * This should only be called if the feature is successfully edited, deleted or if it's source is deleted.
   * @param projectId
   */
  static clearEditFeatureGeometry ({projectId}) {
    if (!isNil(projectId)) {
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
   */
  static addBaseMap (baseMap) {
    store.dispatch('BaseMaps/addBaseMap', baseMap)
  }

  static editBaseMap (baseMap) {
    store.dispatch('BaseMaps/editBaseMap', baseMap)
  }

  static removeBaseMap (baseMap) {
    try {
      FileUtilities.rmDir(baseMap.directory)
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to remove base map.')
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
    if (!isNil(baseMap)) {
      const baseMapCopy = cloneDeep(baseMap)
      baseMapCopy.error = error
      store.dispatch('BaseMaps/editBaseMap', baseMapCopy)
    }

    // search sources for matching id and assign error
    const projectKeys = keys(store.state.Projects)
    for (let i = 0; i < projectKeys.length; i++) {
      const projectId = projectKeys[i]
      const sourceId = keys(store.state.Projects[projectId].sources).find(sourceId => sourceId === id)
      if (!isNil(sourceId)) {
        const source = cloneDeep(store.state.Projects[projectId].sources[sourceId])
        source.error = error
        source.visible = false
        store.dispatch('Projects/setDataSource', {projectId, source})
        break
      }
    }
  }

  static saveConnectionSettings (projectId, sourceId, timeoutMs, rateLimit, retryAttempts) {
    const source = cloneDeep(store.state.Projects[projectId].sources[sourceId])
    source.timeoutMs = timeoutMs
    source.rateLimit = rateLimit
    source.retryAttempts = retryAttempts
    store.dispatch('Projects/setDataSource', {projectId, source})
  }

  static saveBaseMapConnectionSettings (id, timeoutMs, rateLimit, retryAttempts) {
    const baseMap = store.state.BaseMaps.baseMaps.find(baseMap => baseMap.id === id)
    if (!isNil(baseMap)) {
      const baseMapCopy = cloneDeep(baseMap)
      baseMapCopy.layerConfiguration.timeoutMs = timeoutMs
      baseMapCopy.layerConfiguration.rateLimit = rateLimit
      baseMapCopy.layerConfiguration.retryAttempts = retryAttempts
      store.dispatch('BaseMaps/editBaseMap', baseMapCopy)
    }
  }
}
