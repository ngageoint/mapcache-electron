import path from 'path'
import jetpack from 'fs-jetpack'
import isNil from 'lodash/isNil'
import keys from 'lodash/keys'
import cloneDeep from 'lodash/cloneDeep'
import { getLastModifiedDate, rmDirAsync, isDirEmpty, exists } from '../../util/file/FileUtilities'
import store from '../../../store'
import Vue from 'vue'
import { tryCollect } from '../../util/GarbageCollector'
import {
  getOrCreateGeoPackageForApp,
  getGeoPackageFeatureTableForApp,
  getGeoPackageFileSize,
  performSafeGeoPackageOperation,
  _getBoundingBoxForTable,
  getExtentOfGeoPackageTables,
  getOrCreateGeoPackage,
  _getGeoPackageFeatureTableForApp
} from '../../geopackage/GeoPackageCommon'
import {
  updateFeatureGeometry as updateFeatureGeo,
  createFeatureTable,
  _deleteFeatureRow,
  _createFeatureTable,
  _deleteFeatureRows,
  _renameGeoPackageFeatureTableColumn,
  _deleteGeoPackageFeatureTableColumn,
  _addGeoPackageFeatureTableColumn,
  _addFeatureToFeatureTable,
  _addGeoPackageFeatureTableColumns
} from '../../geopackage/GeoPackageFeatureTableUtilities'
import * as GeoPackageStyleUtilities from '../../geopackage/GeoPackageStyleUtilities'
import { LAYER_DIRECTORY_IDENTIFIER } from '../../util/file/FileConstants'
import { _addMediaAttachment } from '../../geopackage/GeoPackageMediaUtilities'

function getGeoPackageFilePath (id, projectId, isGeoPackage, isBaseMap) {
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

function notifyTab ({projectId, tabId}) {
  store.dispatch('UIState/notifyTab', {projectId, tabId})
}

async function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function updateAllFeatureTableStyleKeys (projectId, id, isGeoPackage, isBaseMap = false) {
  if (isGeoPackage) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[id])
    geopackage.modifiedDate = getLastModifiedDate(geopackage.path)
    const featureTables = Object.keys(geopackage.tables.features)
    for (let i = 0; i < featureTables.length; i++) {
      const table = featureTables[i]
      geopackage.tables.features[table].styleKey = geopackage.tables.features[table].styleKey + 1
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

function updateStyleKey (projectId, id, tableName, isGeoPackage, isBaseMap = false) {
  if (isGeoPackage) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[id])
    geopackage.modifiedDate = getLastModifiedDate(geopackage.path)
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

function setDataSource ({projectId, source}) {
  store.dispatch('Projects/setDataSource', {projectId, source})
}

function setProjectName ({project, name}) {
  store.dispatch('Projects/setProjectName', {project, name})
}

function showToolTips ({projectId, show}) {
  store.dispatch('Projects/showToolTips', {projectId, show})
}

function setDataSourceDisplayName ({projectId, sourceId, displayName}) {
  store.dispatch('Projects/setDataSourceDisplayName', {projectId, sourceId, displayName})
}

function addDataSources ({projectId, dataSources}) {
  store.dispatch('Projects/addDataSources', {projectId, dataSources})
}

async function addGeoPackage ({projectId, filePath}) {
  const geopackage = await getOrCreateGeoPackageForApp(filePath)
  if (geopackage != null) {
    await store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    return geopackage.id
  } else {
    return null
  }
}

function setGeoPackageLayersVisible ({projectId, geopackageId, visible}) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  keys(geopackage.tables.tiles).forEach(table => {
    geopackage.tables.tiles[table].visible = visible
  })
  keys(geopackage.tables.features).forEach(table => {
    geopackage.tables.features[table].visible = visible
  })
  store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
}

function setGeoPackageFeatureTableVisible ({projectId, geopackageId, tableName, visible}) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  geopackage.tables.features[tableName].visible = visible
  store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
}

function setGeoPackageTileTableVisible ({projectId, geopackageId, tableName, visible}) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  geopackage.tables.tiles[tableName].visible = visible
  store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
}

function _hasVisibleTables (geopackage) {
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

function renameGeoPackage ({projectId, geopackageId, name}) {
  return new Promise((resolve, reject) => {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    tryCollect()
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
          geopackage.modifiedDate = getLastModifiedDate(geopackage.path)
          renamed = true
        } catch (e) {
          error = e
          await sleep(100)
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

function removeGeoPackage ({projectId, geopackageId}) {
  store.dispatch('Projects/removeGeoPackage', {projectId, geopackageId})
}

function addCopiedGeoPackageTileTable ({projectId, geopackageId, tableName, copyTableName, type = 'feature'}) {
  let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const tableList = type === 'feature' ? geopackage.tables.features : geopackage.tables.tiles
  tableList[copyTableName] = cloneDeep(tableList[tableName])
  tableList[copyTableName].visible = false
  geopackage.modifiedDate = getLastModifiedDate(geopackage.path)
  store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
}

function updateDeletedGeoPackageTileTable ({projectId, geopackageId, tableName, type = 'feature'}) {
  let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const tableList = type === 'feature' ? geopackage.tables.features : geopackage.tables.tiles
  delete tableList[tableName]
  geopackage.modifiedDate = getLastModifiedDate(geopackage.path)
  store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
}

function updateRenamedGeoPackageTable ({projectId, geopackageId, tableName, newTableName, type = 'feature'}) {
  let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const tableList = type === 'feature' ? geopackage.tables.features : geopackage.tables.tiles
  let table = tableList[tableName]
  delete tableList[tableName]
  tableList[newTableName] = table
  geopackage.modifiedDate = getLastModifiedDate(geopackage.path)
  store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
}

async function renameGeoPackageFeatureTableColumn ({projectId, geopackageId, tableName, oldColumnName, newColumnName}) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const existingTable = geopackage.tables.features[tableName]
  const filePath = geopackage.path
  await performSafeGeoPackageOperation(filePath, (gp) => {
    _renameGeoPackageFeatureTableColumn(gp, tableName, oldColumnName, newColumnName)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    updateGeoPackageFileInfo (geopackage)
    if (existingTable != null && existingTable.columnOrder != null) {
      const oldColumnIdx = existingTable.columnOrder.indexOf(oldColumnName.toLowerCase())
      if (oldColumnIdx !== -1) {
        existingTable.columnOrder.splice(oldColumnIdx, 1, newColumnName.toLowerCase())
      }
    }
    updateExistingTable(existingTable, tableInfo, true, true)
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  })
}

async function deleteGeoPackageFeatureTableColumn ({projectId, geopackageId, tableName, columnName}) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const existingTable = geopackage.tables.features[tableName]
  const filePath = geopackage.path
  await performSafeGeoPackageOperation(filePath, (gp) => {
    _deleteGeoPackageFeatureTableColumn(gp, tableName, columnName)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    updateGeoPackageFileInfo (geopackage)
    updateExistingTable(existingTable, tableInfo, true, true)
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  })
}

async function addGeoPackageFeatureTableColumn ({projectId, geopackageId, tableName, columnName, columnType}) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const existingTable = geopackage.tables.features[tableName]
  const filePath = geopackage.path
  await performSafeGeoPackageOperation(filePath, (gp) => {
    _addGeoPackageFeatureTableColumn(gp, tableName, columnName, columnType)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    updateGeoPackageFileInfo (geopackage)
    updateExistingTable(existingTable, tableInfo, true, true)
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  })
}

function removeDataSource ({projectId, sourceId}) {
  const source = store.state.Projects[projectId].sources[sourceId]
  if (!isNil(source.directory)) {
    rmDirAsync(source.directory).then((err) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to remove source layer directory: ' + source.directory)
      }
    })
  }
  if (!isNil(source.sourceDirectory) && exists(source.sourceDirectory) && isDirEmpty(path.join(source.sourceDirectory, LAYER_DIRECTORY_IDENTIFIER))) {
    rmDirAsync(source.sourceDirectory).then((err) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to remove source directory: ' + source.sourceDirectory)
      }
    })
  }
  store.dispatch('Projects/removeDataSource', {projectId, sourceId})
}

function setFeatureStyle ({projectId, id, tableName, featureId, styleId, isGeoPackage, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  GeoPackageStyleUtilities.setFeatureStyle(filePath, tableName, featureId, styleId).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function clearStylingForFeature ({projectId, id, tableName, featureId, isGeoPackage, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  GeoPackageStyleUtilities.clearStylingForFeature(filePath, tableName, featureId).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function setFeatureIcon ({projectId, id, tableName, featureId, iconId, isGeoPackage, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  GeoPackageStyleUtilities.setFeatureIcon(filePath, tableName, featureId, iconId).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function setTableStyle ({projectId, id, tableName, geometryType, styleId, isGeoPackage, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  GeoPackageStyleUtilities.setTableStyle(filePath, tableName, geometryType, styleId).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function setTableIcon ({projectId, id, tableName, geometryType, iconId, isGeoPackage, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  GeoPackageStyleUtilities.setTableIcon(filePath, tableName, geometryType, iconId).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function createStyleRow ({projectId, id, tableName, isGeoPackage, style, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  GeoPackageStyleUtilities.createStyleRow(filePath, tableName, style).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function createIconRow ({projectId, id, tableName, isGeoPackage, icon, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  GeoPackageStyleUtilities.createIconRow(filePath, tableName, icon).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function updateStyleRow ({projectId, id, tableName, styleRow, isGeoPackage, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  GeoPackageStyleUtilities.updateStyleRow(filePath, tableName, styleRow).then(function () {
    updateAllFeatureTableStyleKeys(projectId, id, isGeoPackage, isBaseMap)
  })
}

function updateIconRow ({projectId, id, tableName, iconRow, isGeoPackage, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  GeoPackageStyleUtilities.updateIconRow(filePath, tableName, iconRow).then(function () {
    updateAllFeatureTableStyleKeys(projectId, id, isGeoPackage, isBaseMap)
  })
}

function deleteStyleRow ({projectId, id, styleId, isGeoPackage, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  GeoPackageStyleUtilities.deleteStyleRow(filePath, styleId).then(function () {
    updateAllFeatureTableStyleKeys(projectId, id, isGeoPackage, isBaseMap)
  })
}

function deleteIconRow ({projectId, id, iconId, isGeoPackage, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  GeoPackageStyleUtilities.deleteIconRow(filePath, iconId).then(function () {
    updateAllFeatureTableStyleKeys(projectId, id, isGeoPackage, isBaseMap)
  })
}

function addStyleExtensionForTable ({projectId, id, tableName, isGeoPackage, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  GeoPackageStyleUtilities.addStyleExtensionForTable(filePath, tableName).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function removeStyleExtensionForTable ({projectId, id, tableName, isGeoPackage, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  GeoPackageStyleUtilities.removeStyleExtensionForTable(filePath, tableName).then(function () {
    updateAllFeatureTableStyleKeys(projectId, id, isGeoPackage, isBaseMap)
  })
}

async function addFeatureTableToGeoPackage ({projectId, geopackageId, tableName, featureCollection}) {
  return new Promise((resolve) => {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    const filePath = geopackage.path
    createFeatureTable(filePath, tableName, featureCollection).then(function () {
      getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
        geopackage.size = getGeoPackageFileSize(filePath)
        geopackage.tables.features[tableName] = cloneDeep(tableInfo)
        geopackage.modifiedDate = getLastModifiedDate(geopackage.path)
        store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
        resolve()
      })
    })
  })
}

async function createGeoPackageWithFeatureTable (projectId, filePath, featureTableName, featureCollection) {
  return new Promise ((resolve) => {
    let success = false
    getOrCreateGeoPackage(filePath).then(gp => {
      _createFeatureTable(gp, featureTableName, featureCollection).then(() => {
        addGeoPackage({projectId: projectId, filePath: filePath})
        success = true
      }).catch(() => {
        // eslint-disable-next-line no-console
        console.error('Failed to create feature table.')
      }).finally(() => {
        try {
          gp.close()
          gp = undefined
          // eslint-disable-next-line no-unused-vars
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to close geopackage.')
        }
        resolve(success)
      })
    })
  })
}

function updateFeatureGeometry ({projectId, id, isGeoPackage, tableName, featureGeoJson, isBaseMap}) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  updateFeatureGeo(filePath, tableName, featureGeoJson).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function updateGeoPackageFileInfo (geoPackage) {
  geoPackage.size = getGeoPackageFileSize(geoPackage.path)
  geoPackage.modifiedDate = getLastModifiedDate(geoPackage.path)
  return geoPackage
}

function updateExistingTable (table, tableInfo, updateStyleKey = true, updateColumnOrder = false) {
  table.featureCount = tableInfo.featureCount
  table.extent = tableInfo.extent
  table.description = tableInfo.description
  if (updateStyleKey) {
    table.styleKey = table.styleKey + 1
  }
  table.indexed = tableInfo.indexed
  if (updateColumnOrder) {
    table.columnOrder = validateColumnOrder(table.columnOrder, tableInfo.columnOrder)
  }
  return table
}

async function addFeatureToGeoPackage ({projectId, geopackageId, tableName, feature, columnsToAdd = []}) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const existingTable = geopackage.tables.features[tableName]
  const filePath = store.state.Projects[projectId].geopackages[geopackageId].path
  return performSafeGeoPackageOperation(filePath, (gp) => {
    _addGeoPackageFeatureTableColumns(gp, tableName, columnsToAdd)
    const featureDao = gp.getFeatureDao(tableName)
    const rowId = _addFeatureToFeatureTable(gp, featureDao, tableName, feature)
    if (feature.attachment != null) {
      _addMediaAttachment(gp, tableName, rowId, feature.attachment)
    }
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    updateGeoPackageFileInfo(geopackage)
    updateExistingTable(existingTable, tableInfo, true, true)
    if (!existingTable.visible) {
      existingTable.visible = true
    }
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  })
}

async function updateGeoPackageFeatureTableColumnOrder ({projectId, geopackageId, tableName, columnOrder}) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const existingTable = geopackage.tables.features[tableName]
  if (existingTable != null) {
    const tableInfo = await getGeoPackageFeatureTableForApp(geopackage.path, tableName)
    if (tableInfo != null) {
      existingTable.columnOrder = validateColumnOrder(columnOrder, tableInfo.columnOrder)
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    }
  }
}

async function updateDataSourceColumnOrder ({projectId, sourceId, columnOrder}) {
  const source = cloneDeep(store.state.Projects[projectId].sources[sourceId])
  const tableInfo = await getGeoPackageFeatureTableForApp(source.geopackageFilePath, source.sourceLayerName)
  if (tableInfo != null) {
    source.columnOrder =  validateColumnOrder(columnOrder, tableInfo.columnOrder)
    store.dispatch('Projects/setDataSource', {projectId, source})
  }
}

function updateFeatureTable ({projectId, geopackageId, tableName}) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const existingTable = geopackage.tables.features[tableName]
  const filePath = geopackage.path
  getGeoPackageFeatureTableForApp(filePath, tableName).then(tableInfo => {
    updateGeoPackageFileInfo (geopackage)
    updateExistingTable(existingTable, tableInfo)
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  })
}

function deleteFeatureIdsFromGeoPackage ({projectId, geopackageId, tableName, featureIds}) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const existingTable = geopackage.tables.features[tableName]
  const filePath = geopackage.path
  performSafeGeoPackageOperation(filePath, (gp) => {
    _deleteFeatureRows(gp, tableName, featureIds)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    updateGeoPackageFileInfo (geopackage)
    updateExistingTable(existingTable, tableInfo)
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  })
}

function removeFeatureFromGeopackage ({projectId, geopackageId, tableName, featureId}) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const existingTable = geopackage.tables.features[tableName]
  const filePath = geopackage.path
  performSafeGeoPackageOperation(filePath, (gp) => {
    _deleteFeatureRow(gp, tableName, featureId)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    updateGeoPackageFileInfo (geopackage)
    updateExistingTable(existingTable, tableInfo)
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  })
}

function deleteFeatureIdsFromDataSource ({projectId, sourceId, featureIds}) {
  const sourceCopy = cloneDeep(store.state.Projects[projectId].sources[sourceId])
  const filePath = sourceCopy.geopackageFilePath
  performSafeGeoPackageOperation(filePath, (gp) => {
    const numberDeleted = _deleteFeatureRows(gp, sourceCopy.sourceLayerName, featureIds)
    sourceCopy.extent = _getBoundingBoxForTable(gp, sourceCopy.sourceLayerName)
    sourceCopy.count = sourceCopy.count - numberDeleted
    store.dispatch('Projects/setDataSource', {projectId, source: sourceCopy})
  })
}

function removeFeatureFromDataSource ({projectId, sourceId, featureId}) {
  const sourceCopy = cloneDeep(store.state.Projects[projectId].sources[sourceId])
  const filePath = sourceCopy.geopackageFilePath
  performSafeGeoPackageOperation(filePath, (gp) => {
    const numberDeleted = _deleteFeatureRow(gp, sourceCopy.sourceLayerName, featureId)
    sourceCopy.extent = _getBoundingBoxForTable(gp, sourceCopy.sourceLayerName)
    sourceCopy.count = sourceCopy.count - numberDeleted
    store.dispatch('Projects/setDataSource', {projectId, source: sourceCopy})
  })
}

function setProjectMaxFeatures ({projectId, maxFeatures}) {
  store.dispatch('Projects/setProjectMaxFeatures', {projectId, maxFeatures})
}

function setZoomControlEnabled ({projectId, enabled}) {
  store.dispatch('Projects/setZoomControlEnabled', {projectId, enabled})
}

function setDisplayZoomEnabled ({projectId, enabled}) {
  store.dispatch('Projects/setDisplayZoomEnabled', {projectId, enabled})
}

function setDisplayAddressSearchBar ({projectId, enabled}) {
  store.dispatch('Projects/setDisplayAddressSearchBar', {projectId, enabled})
}

function setDisplayCoordinates ({projectId, enabled}) {
  store.dispatch('Projects/setDisplayCoordinates', {projectId, enabled})
}

function setDisplayScale ({projectId, enabled}) {
  store.dispatch('Projects/setDisplayScale', {projectId, enabled})
}

function clearActiveLayers ({projectId}) {
  store.dispatch('Projects/clearActiveLayers', {projectId})
}

async function getExtentOfActiveLayers (projectId) {
  let overallExtent = null
  try {
    let geopackageKeys = keys(store.state.Projects[projectId].geopackages)
    for (let i = 0; i < geopackageKeys.length; i++) {
      const geopackageId = geopackageKeys[i]
      const geopackage = store.state.Projects[projectId].geopackages[geopackageId]
      const tablesToZoomTo = keys(geopackage.tables.features).filter(table => geopackage.tables.features[table].visible).concat(keys(geopackage.tables.tiles).filter(table => geopackage.tables.tiles[table].visible))
      const extentForGeoPackage = await getExtentOfGeoPackageTables(geopackage.path, tablesToZoomTo)
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
  return overallExtent
}

/**
 * Handles updates to the column order based on actual columns
 * @param columnOrder
 * @param actualColumns
 */
function validateColumnOrder (columnOrder, actualColumns) {
  let newColumnOrder
  if (columnOrder == null) {
    newColumnOrder = actualColumns.slice()
  } else {
    newColumnOrder = columnOrder.slice()
    actualColumns.forEach(column => {
      if (newColumnOrder.indexOf(column) === -1) {
        newColumnOrder.push(column)
      }
    })
    newColumnOrder = newColumnOrder.filter(column => actualColumns.indexOf(column) !== -1)
  }
  return newColumnOrder
}

/**
 * Will synchronize the geopackage with what is on the file system. Then it will update the store
 * @param projectId
 * @param geopackageId
 */
function synchronizeGeoPackage ({projectId, geopackageId}) {
  const geopackageCopy = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  getOrCreateGeoPackageForApp(geopackageCopy.path).then(geopackage => {
    geopackage.id = geopackageId
    keys(geopackage.tables.features).forEach(table => {
      const featureTable = geopackage.tables.features[table]
      const originalTable = geopackageCopy.tables.features[table]
      if (!isNil(originalTable)) {
        featureTable.visible = originalTable.visible
        featureTable.columnOrder = validateColumnOrder(originalTable.columnOrder, featureTable.columnOrder)
      }
    })
    keys(geopackage.tables.tiles).forEach(table => {
      const tileTable = geopackage.tables.tiles[table]
      const originalTable = geopackageCopy.tables.tiles[table]
      if (!isNil(originalTable)) {
        tileTable.visible = originalTable.visible
      }
    })
    geopackage.modifiedDate = getLastModifiedDate(geopackage.path)
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  })
}

function synchronizeDataSource ({projectId, sourceId}) {
  const sourceCopy = cloneDeep(store.state.Projects[projectId].sources[sourceId])
  const filePath = sourceCopy.geopackageFilePath
  performSafeGeoPackageOperation(filePath, (gp) => {
    sourceCopy.extent = _getBoundingBoxForTable(gp, sourceCopy.sourceLayerName)
    sourceCopy.count = gp.getFeatureDao(sourceCopy.sourceLayerName).count()
    store.dispatch('Projects/setDataSource', {projectId, source: sourceCopy})
  })
}

function setActiveGeoPackage ({projectId, geopackageId}) {
  store.dispatch('Projects/setActiveGeoPackage', {projectId, geopackageId})
}

function setActiveGeoPackageFeatureLayer ({projectId, geopackageId, tableName}) {
  if (!isNil(projectId)) {
    store.dispatch('Projects/setActiveGeoPackageFeatureLayer', {projectId, geopackageId, tableName})
  }
}

function setDarkTheme ({projectId, enabled}) {
  store.dispatch('UIState/setDarkTheme', {projectId, enabled})
}

function clearNotification ({projectId, tabId}) {
  store.dispatch('UIState/clearNotification', {projectId, tabId})
}

function clearNotifications ({projectId}) {
  store.dispatch('UIState/clearNotifications', {projectId})
}

function setMapZoom ({projectId, mapZoom}) {
  store.dispatch('UIState/setMapZoom', {projectId, mapZoom})
}

/**
 * Sets the rendering order of the map
 * @param projectId
 * @param renderingOrder
 */
function setMapRenderingOrder ({projectId, mapRenderingOrder}) {
  store.dispatch('Projects/setMapRenderingOrder', {projectId, mapRenderingOrder})
}

/**
 * Sets the preview layer when adding URL data source
 * @param projectId
 * @param previewLayer
 */
function setPreviewLayer ({projectId, previewLayer}) {
  store.dispatch('UIState/setPreviewLayer', {projectId, previewLayer})
}

/**
 * Sets the preview layer when adding URL data source
 * @param projectId
 * @param popOut
 */
function popOutFeatureTable ({projectId, popOut}) {
  store.dispatch('UIState/popOutFeatureTable', {projectId, popOut})
}

/**
 * Sets the preview layer when adding URL data source
 * @param projectId
 */
function clearPreviewLayer ({projectId}) {
  store.dispatch('UIState/clearPreviewLayer', {projectId})
}

/**
 * Adds a base map to the application
 */
function addBaseMap (baseMap) {
  store.dispatch('BaseMaps/addBaseMap', baseMap)
}

function editBaseMap (baseMap) {
  store.dispatch('BaseMaps/editBaseMap', baseMap)
}

function removeBaseMap (baseMap) {
  rmDirAsync(baseMap.directory).then((err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to remove base map directory: ' + baseMap.directory)
    }
  })

  store.dispatch('BaseMaps/removeBaseMap', baseMap.id)
}

/**
 * this attempts to apply the error to the source
 * @param id
 * @param error
 */
function setSourceError ({id, error}) {
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

function saveConnectionSettings (projectId, sourceId, timeoutMs, rateLimit, retryAttempts) {
  const source = cloneDeep(store.state.Projects[projectId].sources[sourceId])
  source.timeoutMs = timeoutMs
  source.rateLimit = rateLimit
  source.retryAttempts = retryAttempts
  store.dispatch('Projects/setDataSource', {projectId, source})
}

function saveBaseMapConnectionSettings (id, timeoutMs, rateLimit, retryAttempts) {
  const baseMap = store.state.BaseMaps.baseMaps.find(baseMap => baseMap.id === id)
  if (!isNil(baseMap)) {
    const baseMapCopy = cloneDeep(baseMap)
    baseMapCopy.layerConfiguration.timeoutMs = timeoutMs
    baseMapCopy.layerConfiguration.rateLimit = rateLimit
    baseMapCopy.layerConfiguration.retryAttempts = retryAttempts
    store.dispatch('BaseMaps/editBaseMap', baseMapCopy)
  }
}

export {
  setDataSource,
  setProjectName,
  showToolTips,
  setDataSourceDisplayName,
  addDataSources,
  addGeoPackage,
  setGeoPackageLayersVisible,
  setGeoPackageFeatureTableVisible,
  setGeoPackageTileTableVisible,
  _hasVisibleTables,
  sleep,
  renameGeoPackage,
  removeGeoPackage,
  updateRenamedGeoPackageTable,
  updateDeletedGeoPackageTileTable,
  addCopiedGeoPackageTileTable,
  renameGeoPackageFeatureTableColumn,
  deleteGeoPackageFeatureTableColumn,
  addGeoPackageFeatureTableColumn,
  removeDataSource,
  getGeoPackageFilePath,
  setFeatureStyle,
  setFeatureIcon,
  setTableStyle,
  setTableIcon,
  createStyleRow,
  createIconRow,
  updateStyleRow,
  updateIconRow,
  deleteStyleRow,
  deleteIconRow,
  addStyleExtensionForTable,
  removeStyleExtensionForTable,
  addFeatureTableToGeoPackage,
  updateFeatureGeometry,
  addFeatureToGeoPackage,
  updateFeatureTable,
  removeFeatureFromGeopackage,
  removeFeatureFromDataSource,
  setProjectMaxFeatures,
  setZoomControlEnabled,
  setDisplayZoomEnabled,
  setDisplayAddressSearchBar,
  setDisplayCoordinates,
  setDisplayScale,
  clearActiveLayers,
  getExtentOfActiveLayers,
  synchronizeGeoPackage,
  synchronizeDataSource,
  setActiveGeoPackage,
  setActiveGeoPackageFeatureLayer,
  updateStyleKey,
  setDarkTheme,
  notifyTab,
  clearNotification,
  clearNotifications,
  setMapZoom,
  setMapRenderingOrder,
  setPreviewLayer,
  clearPreviewLayer,
  addBaseMap,
  editBaseMap,
  removeBaseMap,
  setSourceError,
  saveConnectionSettings,
  saveBaseMapConnectionSettings,
  clearStylingForFeature,
  createGeoPackageWithFeatureTable,
  deleteFeatureIdsFromGeoPackage,
  deleteFeatureIdsFromDataSource,
  popOutFeatureTable,
  updateGeoPackageFeatureTableColumnOrder,
  updateDataSourceColumnOrder
}
