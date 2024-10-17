import cloneDeep from 'lodash/cloneDeep'
import store from '../../../renderer/src/store/renderer'
import { isProxy, toRaw } from 'vue';

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

function notifyTab (projectId, tabId) {
  return store.dispatch('UIState/notifyTab', { projectId, tabId })
}

function updateAllFeatureTableStyleKeys (projectId, id, isGeoPackage, isBaseMap = false) {
  if (isGeoPackage) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[id])
    geopackage.modifiedDate = window.mapcache.getLastModifiedDate(geopackage.path)
    const featureTables = Object.keys(geopackage.tables.features)
    for (let i = 0; i < featureTables.length; i++) {
      const table = featureTables[i]
      geopackage.tables.features[table].styleKey = geopackage.tables.features[table].styleKey + 1
    }
    return setGeoPackage(projectId, geopackage)
  } else if (isBaseMap) {
    const baseMap = cloneDeep(store.state.BaseMaps.baseMaps.find(baseMap => baseMap.id === id))
    baseMap.layerConfiguration.styleKey = baseMap.layerConfiguration.styleKey + 1
    return setBaseMap(baseMap)
  } else {
    const source = cloneDeep(store.state.Projects[projectId].sources[id])
    source.styleKey = source.styleKey + 1
    return setDataSource(projectId, source)
  }
}

function updateStyleKey (projectId, id, tableName, isGeoPackage, isBaseMap = false) {
  if (isGeoPackage) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[id])
    geopackage.modifiedDate = window.mapcache.getLastModifiedDate(geopackage.path)
    if (geopackage.tables.features[tableName]) {
      geopackage.tables.features[tableName].styleKey = geopackage.tables.features[tableName].styleKey + 1
    } else if (geopackage.tables.tiles[tableName]) {
      geopackage.tables.tiles[tableName].styleKey = geopackage.tables.tiles[tableName].styleKey + 1
    }
    return setGeoPackage(projectId, geopackage)
  } else if (isBaseMap) {
    const baseMap = cloneDeep(store.state.BaseMaps.baseMaps.find(baseMap => baseMap.id === id))
    baseMap.layerConfiguration.styleKey = baseMap.layerConfiguration.styleKey + 1
    return setBaseMap(baseMap)
  } else {
    const source = cloneDeep(store.state.Projects[projectId].sources[id])
    source.styleKey = source.styleKey + 1
    return setDataSource(projectId, source)
  }
}

function setGeoPackage (projectId, geopackage) {
  Object.keys(geopackage).forEach(key => {
    if (isProxy(geopackage[key])) {
      geopackage[key] = toRaw(geopackage[key])
    }
  })
  return store.dispatch('Projects/setGeoPackage', { projectId, geopackage })
}

function setDataSource (projectId, source) {
  Object.keys(source).forEach(key => {
    if (isProxy(source[key])) {
      source[key] = toRaw(source[key])
    }
  })
  return store.dispatch('Projects/setDataSource', { projectId, source: source })
}

function setBaseMap (baseMap) {
  Object.keys(baseMap).forEach(key => {
    if (isProxy(baseMap[key])) {
      baseMap[key] = toRaw(baseMap[key])
    }
  })
  return store.dispatch('BaseMaps/editBaseMap', baseMap)
}

function setProjectName (projectId, name) {
  return store.dispatch('Projects/setProjectName', { projectId, name })
}

function setNominatimUrl (url) {
  return store.dispatch('URLs/setNominatimUrl', url)
}

function setOverpassUrl (url) {
  return store.dispatch('URLs/setOverpassUrl', url)
}

function showToolTips (projectId, show) {
  return store.dispatch('Projects/showToolTips', { projectId, show })
}

function setMapProjection (projectId, mapProjection) {
  return store.dispatch('Projects/setMapProjection', { projectId, mapProjection })
}

function setDataSourceDisplayName (projectId, sourceId, displayName) {
  return store.dispatch('Projects/setDataSourceDisplayName', { projectId, sourceId, displayName })
}

async function addDataSources (projectId, dataSources) {
  dataSources = toRaw(dataSources)
  for (let i = 0; i < dataSources.length; i++) {
    const source = dataSources[i]
    Object.keys(source).forEach(key => {
      if (isProxy(source[key])) {
        source[key] = toRaw(source[key])
      }
    })
    if (source.config.geopackageFilePath != null) {
      source.table = await window.mapcache.getGeoPackageFeatureTableForApp(source.config.geopackageFilePath, source.config.sourceLayerName)
    }
  }
  return await store.dispatch('Projects/addDataSources', { projectId, dataSources })
}


function setGeoPackageLayersVisible (projectId, geopackageId, visible) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  Object.keys(geopackage.tables.tiles).forEach(table => {
    geopackage.tables.tiles[table].visible = visible
  })
  Object.keys(geopackage.tables.features).forEach(table => {
    geopackage.tables.features[table].visible = visible
  })
  return setGeoPackage(projectId, geopackage)
}

function setGeoPackageFeatureTableVisible (projectId, geopackageId, tableName, visible) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  geopackage.tables.features[tableName].visible = visible
  return setGeoPackage(projectId, geopackage)
}

function setGeoPackageTileTableVisible (projectId, geopackageId, tableName, visible) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  geopackage.tables.tiles[tableName].visible = visible
  return setGeoPackage(projectId, geopackage)
}

function _hasVisibleTables (geoPackage) {
  let hasVisibleTables = false
  Object.keys(geoPackage.tables.features).forEach(table => {
    if (geoPackage.tables.features[table].visible) {
      hasVisibleTables = true
    }
  })
  Object.keys(geoPackage.tables.tiles).forEach(table => {
    if (geoPackage.tables.tiles[table].visible) {
      hasVisibleTables = true
    }
  })
  return hasVisibleTables
}

/**
 * Renames a GeoPackage and handles calling preload to perform node.js functions for renaming
 * @param projectId
 * @param geopackageId
 * @param name
 * @return {Promise<boolean>}
 */
async function renameGeoPackage (projectId, geopackageId, name) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const { success, path, modifiedDate } = await window.mapcache.renameGeoPackage(geopackage.path, name);
  if (success) {
    geopackage.path = path
    geopackage.name = name
    geopackage.modifiedDate = modifiedDate
    await setGeoPackage(projectId, geopackage)
  }
  return success
}

function removeGeoPackage (projectId, geopackageId) {
  return store.dispatch('Projects/removeGeoPackage', { projectId, geopackageId })
}

async function copyGeoPackageTable (projectId, geopackageId, filePath, tableName, copyTableName, type = 'feature') {
  const success = window.mapcache.copyGeoPackageTable(filePath, tableName, copyTableName)
  if (success) {
    let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    const tableList = type === 'feature' ? geopackage.tables.features : geopackage.tables.tiles
    tableList[copyTableName] = cloneDeep(tableList[tableName])
    tableList[copyTableName].visible = false
    geopackage.modifiedDate = window.mapcache.getLastModifiedDate(geopackage.path)
    return setGeoPackage(projectId, geopackage)
  }
}

async function renameGeoPackageTable (projectId, geopackageId, filePath, tableName, newTableName, type = 'feature') {
  const success = await window.mapcache.renameGeoPackageTable(filePath, tableName, newTableName)
  if (success) {
    let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    const tableList = type === 'feature' ? geopackage.tables.features : geopackage.tables.tiles
    tableList[newTableName] = cloneDeep(tableList[tableName])
    delete tableList[tableName]
    geopackage.modifiedDate = window.mapcache.getLastModifiedDate(geopackage.path)
    return setGeoPackage(projectId, geopackage)
  }
}

async function deleteGeoPackageTable (projectId, geopackageId, filePath, tableName, type = 'feature', silent = false) {
  const success = await window.mapcache.deleteGeoPackageTable(filePath, tableName)
  if (success && !silent) {
    let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    const tableList = type === 'feature' ? geopackage.tables.features : geopackage.tables.tiles
    delete tableList[tableName]
    geopackage.modifiedDate = window.mapcache.getLastModifiedDate(geopackage.path)
    return setGeoPackage(projectId, geopackage)
  }
}

function updateRenamedGeoPackageTable (projectId, geopackageId, tableName, newTableName, type = 'feature') {
  let geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const tableList = type === 'feature' ? geopackage.tables.features : geopackage.tables.tiles
  let table = tableList[tableName]
  delete tableList[tableName]
  tableList[newTableName] = table
  geopackage.modifiedDate = window.mapcache.getLastModifiedDate(geopackage.path)
  return setGeoPackage(projectId, geopackage)
}

async function renameFeatureTableColumn (projectId, id, isGeoPackage, tableName, oldColumnName, newColumnName) {
  if (isGeoPackage) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[id])
    const updatedGeoPackage = await window.mapcache.renameGeoPackageFeatureTableColumn(geopackage, tableName, oldColumnName, newColumnName)
    return setGeoPackage(projectId, updatedGeoPackage)
  } else {
    const source = cloneDeep(store.state.Projects[projectId].sources[id])
    const updatedSource = await window.mapcache.renameDataSourceFeatureTableColumn(source, tableName, oldColumnName, newColumnName)
    return setDataSource(projectId, updatedSource)
  }
}

async function deleteGeoPackageFeatureTableColumn (projectId, id, isGeoPackage, tableName, columnName) {
  if (isGeoPackage) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[id])
    const updatedGeoPackage = await window.mapcache.deleteGeoPackageFeatureTableColumn(geopackage, tableName, columnName)
    await setGeoPackage(projectId, updatedGeoPackage)
  } else {
    const source = cloneDeep(store.state.Projects[projectId].sources[id])
    const updatedSource = await window.mapcache.deleteDataSourceFeatureTableColumn(source, tableName, columnName)
    await setDataSource(projectId, updatedSource)
  }
}

async function addGeoPackageFeatureTableColumn (projectId, id, isGeoPackage, tableName, columnName, columnType) {
  if (isGeoPackage) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[id])
    const updatedGeoPackage = await window.mapcache.addGeoPackageFeatureTableColumn(geopackage, tableName, columnName, columnType)
    return setGeoPackage(projectId, updatedGeoPackage)
  } else {
    const source = cloneDeep(store.state.Projects[projectId].sources[id])
    const updatedDataSource = await window.mapcache.addDataSourceFeatureTableColumn(source, tableName, columnName, columnType)
    return setDataSource(projectId, updatedDataSource)
  }
}

async function removeDataSource (projectId, sourceId) {
  const source = cloneDeep(store.state.Projects[projectId].sources[sourceId])
  await window.mapcache.deleteSourceDirectory(source)
  return store.dispatch('Projects/removeDataSource', { projectId, sourceId })
}

function setFeatureStyle (projectId, id, tableName, featureId, styleId, isGeoPackage, isBaseMap) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  window.mapcache.setFeatureStyle(filePath, tableName, featureId, styleId).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function clearStylingForFeature (projectId, id, tableName, featureId, isGeoPackage, isBaseMap) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  window.mapcache.clearStylingForFeature(filePath, tableName, featureId).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function setFeatureIcon (projectId, id, tableName, featureId, iconId, isGeoPackage, isBaseMap) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  window.mapcache.setFeatureIcon(filePath, tableName, featureId, iconId).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function setTableStyle (projectId, id, tableName, geometryType, styleId, isGeoPackage, isBaseMap) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  window.mapcache.setTableStyle(filePath, tableName, geometryType, styleId).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function setTableIcon (projectId, id, tableName, geometryType, iconId, isGeoPackage, isBaseMap) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  window.mapcache.setTableIcon(filePath, tableName, geometryType, iconId).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function createStyleRow (projectId, id, tableName, style, isGeoPackage, isBaseMap) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  window.mapcache.createStyleRow(filePath, tableName, style).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function createIconRow (projectId, id, tableName, icon, isGeoPackage, isBaseMap) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  window.mapcache.createIconRow(filePath, tableName, icon).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function updateStyleRow (projectId, id, tableName, styleRow, isGeoPackage, isBaseMap) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  window.mapcache.updateStyleRow(filePath, tableName, styleRow).then(function () {
    updateAllFeatureTableStyleKeys(projectId, id, isGeoPackage, isBaseMap)
  })
}

function updateIconRow (projectId, id, tableName, iconRow, isGeoPackage, isBaseMap) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  window.mapcache.updateIconRow(filePath, tableName, iconRow).then(function () {
    updateAllFeatureTableStyleKeys(projectId, id, isGeoPackage, isBaseMap)
  })
}

function deleteStyleRow (projectId, id, styleId, isGeoPackage, isBaseMap) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  window.mapcache.deleteStyleRow(filePath, styleId).then(function () {
    updateAllFeatureTableStyleKeys(projectId, id, isGeoPackage, isBaseMap)
  })
}

function deleteIconRow (projectId, id, iconId, isGeoPackage, isBaseMap) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  window.mapcache.deleteIconRow(filePath, iconId).then(function () {
    updateAllFeatureTableStyleKeys(projectId, id, isGeoPackage, isBaseMap)
  })
}

function addStyleExtensionForTable (projectId, id, tableName, isGeoPackage, isBaseMap) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  window.mapcache.addStyleExtensionForTable(filePath, tableName).then(function () {
    updateStyleKey(projectId, id, tableName, isGeoPackage, isBaseMap)
  })
}

function removeStyleExtensionForTable (projectId, id, tableName, isGeoPackage, isBaseMap) {
  const filePath = getGeoPackageFilePath(id, projectId, isGeoPackage, isBaseMap)
  window.mapcache.removeStyleExtensionForTable(filePath, tableName).then(function () {
    updateAllFeatureTableStyleKeys(projectId, id, isGeoPackage, isBaseMap)
  })
}

async function addFeatureTableToGeoPackage (projectId, geopackageId, tableName, featureCollection) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const updatedGeoPackage = await window.mapcache.addFeatureTableToGeoPackage(geopackage, tableName, featureCollection)
  return setGeoPackage(projectId, updatedGeoPackage)
}

async function addFeatureToGeoPackage (projectId, geopackageId, tableName, feature, columnsToAdd = []) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const updatedGeoPackage = await window.mapcache.addFeatureToGeoPackage(geopackage, tableName, feature, columnsToAdd)
  return setGeoPackage(projectId, updatedGeoPackage)
}

async function updateGeoPackageFeatureTableColumnOrder (projectId, id, isGeoPackage, tableName, columnOrder) {
  if (isGeoPackage) {
    const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[id])
    const existingTable = geopackage.tables.features[tableName]
    const filePath = geopackage.path
    const tableInfo = await window.mapcache.getGeoPackageFeatureTableForApp(filePath, tableName)
    if (tableInfo != null) {
      existingTable.columnOrder = validateColumnOrder(columnOrder, tableInfo.columnOrder)
      return setGeoPackage(projectId, geopackage)
    }
  } else {
    const source = cloneDeep(store.state.Projects[projectId].sources[id])
    const filePath = source.geopackageFilePath
    const tableInfo = await window.mapcache.getGeoPackageFeatureTableForApp(filePath, tableName)
    if (tableInfo != null) {
      if (source.table == null) {
        source.table = tableInfo
      }
      source.table.columnOrder = validateColumnOrder(columnOrder, tableInfo.columnOrder)
      return setDataSource(projectId, source)
    }
  }
}

async function updateFeatureTable (projectId, geopackageId, tableName) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const updatedGeoPackage = window.mapcache.updateFeatureTable(geopackage, tableName)
  return setGeoPackage(projectId, updatedGeoPackage)
}

async function deleteFeatureIdsFromGeoPackage (projectId, geopackageId, tableName, featureIds) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const updatedGeoPackage = await window.mapcache.deleteFeatureIdsFromGeoPackage(geopackage, tableName, featureIds)
  return setGeoPackage(projectId, updatedGeoPackage)
}

async function deleteFeatureIdsFromDataSource (projectId, sourceId, featureIds) {
  const source = cloneDeep(store.state.Projects[projectId].sources[sourceId])
  const updatedSource = await window.mapcache.deleteFeatureIdsFromDataSource(source, featureIds)
  return setDataSource(projectId, updatedSource)
}

async function removeFeatureFromGeoPackage (projectId, geopackageId, tableName, featureId) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const updatedGeoPackage = await window.mapcache.removeFeatureFromGeoPackage(geopackage, tableName, featureId)
  return setGeoPackage(projectId, updatedGeoPackage)
}

async function removeFeatureFromDataSource (projectId, sourceId, featureId) {
  const source = cloneDeep(store.state.Projects[projectId].sources[sourceId])
  const updatedSource = await window.mapcache.removeFeatureFromDataSource(source, featureId)
  return setDataSource(projectId, updatedSource)
}

function setProjectMaxFeatures (projectId, maxFeatures) {
  return store.dispatch('Projects/setProjectMaxFeatures', { projectId, maxFeatures })
}

function setZoomControlEnabled (projectId, enabled) {
  return store.dispatch('Projects/setZoomControlEnabled', { projectId, enabled })
}

function setDisplayZoomEnabled (projectId, enabled) {
  return store.dispatch('Projects/setDisplayZoomEnabled', { projectId, enabled })
}

function setDisplayAddressSearchBar (projectId, enabled) {
  return store.dispatch('Projects/setDisplayAddressSearchBar', { projectId, enabled })
}

function setDisplayCoordinates (projectId, enabled) {
  return store.dispatch('Projects/setDisplayCoordinates', { projectId, enabled })
}

function setDisplayScale (projectId, enabled) {
  return store.dispatch('Projects/setDisplayScale', { projectId, enabled })
}

function clearActiveLayers (projectId) {
  return store.dispatch('Projects/clearActiveLayers', { projectId })
}

function increaseExtent(overallExtent, additionalExtent) {
  if (overallExtent == null) {
    overallExtent = additionalExtent.slice()
  } else if (additionalExtent != null) {
    if (additionalExtent[0] < overallExtent[0]) {
      overallExtent[0] = additionalExtent[0]
    }
    if (additionalExtent[1] < overallExtent[1]) {
      overallExtent[1] = additionalExtent[1]
    }
    if (additionalExtent[2] > overallExtent[2]) {
      overallExtent[2] = additionalExtent[2]
    }
    if (additionalExtent[3] > overallExtent[3]) {
      overallExtent[3] = additionalExtent[3]
    }
  }
  return overallExtent
}

async function getExtentOfActiveLayers (projectId) {
  let overallExtent = null
  try {
    let geopackageKeys = Object.keys(store.state.Projects[projectId].geopackages)
    for (let i = 0; i < geopackageKeys.length; i++) {
      const geopackageId = geopackageKeys[i]
      const geopackage = store.state.Projects[projectId].geopackages[geopackageId]
      const tablesToZoomTo = Object.keys(geopackage.tables.features).filter(table => geopackage.tables.features[table].visible).concat(Object.keys(geopackage.tables.tiles).filter(table => geopackage.tables.tiles[table].visible))
      const extentForGeoPackage = await window.mapcache.getExtentOfGeoPackageTables(geopackage.path, tablesToZoomTo)
      overallExtent = increaseExtent(overallExtent, extentForGeoPackage)
    }
    const visibleSourceKeys = Object.keys(store.state.Projects[projectId].sources).filter(key => store.state.Projects[projectId].sources[key].visible)
    visibleSourceKeys.forEach(key => {
      const layerExtent = store.state.Projects[projectId].sources[key].extent
      overallExtent = increaseExtent(overallExtent, layerExtent)
    })
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
async function synchronizeGeoPackage (projectId, geopackageId) {
  const geopackage = cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
  const synchronizedGeoPackage = await window.mapcache.synchronizeGeoPackage(geopackage)
  return setGeoPackage(projectId, synchronizedGeoPackage)
}

async function synchronizeDataSource (projectId, sourceId) {
  const source = cloneDeep(store.state.Projects[projectId].sources[sourceId])
  const synchronizedSource = await window.mapcache.synchronizeDataSource(source)
  return setDataSource(projectId, synchronizedSource)
}

function setActiveGeoPackage (projectId, geopackageId) {
  return store.dispatch('Projects/setActiveGeoPackage', { projectId, geopackageId })
}

function setActiveGeoPackageFeatureLayer (projectId, geopackageId, tableName) {
  if (projectId != null) {
    return store.dispatch('Projects/setActiveGeoPackageFeatureLayer', { projectId, geopackageId, tableName })
  }
}

function setConsent (consent) {
  return store.dispatch('UIState/setConsent', {consent})
}

function setDarkTheme (projectId, enabled) {
  return store.dispatch('UIState/setDarkTheme', { projectId, enabled })
}

function allowNotifications (projectId, allow) {
  return store.dispatch('UIState/allowNotifications', { projectId, allow })
}

function clearNotification (projectId, tabId) {
  return store.dispatch('UIState/clearNotification', { projectId, tabId })
}

function clearNotifications (projectId) {
  return store.dispatch('UIState/clearNotifications', { projectId })
}

function setMapZoom (projectId, mapZoom) {
  return store.dispatch('UIState/setMapZoom', { projectId, mapZoom })
}

function addProjectState (projectId) {
  return store.dispatch('UIState/addProjectState', { projectId })
}

function setMapRenderingOrder (projectId, mapRenderingOrder) {
  return store.dispatch('Projects/setMapRenderingOrder', { projectId, mapRenderingOrder })
}

function popOutFeatureTable (projectId, popOut) {
  return store.dispatch('UIState/popOutFeatureTable', { projectId, popOut })
}

/**
 * Adds a base map to the application
 */
function addBaseMap (baseMap) {
  return store.dispatch('BaseMaps/addBaseMap', baseMap)
}

async function removeBaseMap (baseMap) {
  const err = await window.mapcache.deleteBaseMapDirectory(cloneDeep(baseMap))
  if (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to remove base map directory: ' + baseMap.directory)
  }

  return store.dispatch('BaseMaps/removeBaseMap', baseMap.id)
}

/**
 * this attempts to apply the error to the source
 * @param id
 * @param error
 */
function setSourceError (id, error) {
  // search basemaps for matching id and assign error
  const baseMap = store.state.BaseMaps.baseMaps.find(baseMap => baseMap.id === id)
  if (baseMap != null) {
    const baseMapCopy = cloneDeep(baseMap)
    baseMapCopy.error = error
    return setBaseMap(baseMapCopy)
  }

  // search sources for matching id and assign error
  const projectKeys = Object.keys(store.state.Projects)
  for (let i = 0; i < projectKeys.length; i++) {
    const projectId = projectKeys[i]
    const sourceId = Object.keys(store.state.Projects[projectId].sources).find(sourceId => sourceId === id)
    if (sourceId != null) {
      const source = cloneDeep(store.state.Projects[projectId].sources[sourceId])
      source.error = error
      source.visible = false
      return setDataSource(projectId, source)
    }
  }
}

/**
 * this attempts to apply the warning to the source
 * @param id
 * @param warning The warning message.
 */
function setSourceWarning (id, warning) {
  // search basemaps for matching id and assign error
  const baseMap = store.state.BaseMaps.baseMaps.find(baseMap => baseMap.id === id)
  if (baseMap != null) {
    const baseMapCopy = cloneDeep(baseMap)
    baseMapCopy.warning = warning
    return setBaseMap(baseMapCopy)
  }

  // search sources for matching id and assign error
  const projectKeys = Object.keys(store.state.Projects)
  for (let i = 0; i < projectKeys.length; i++) {
    const projectId = projectKeys[i]
    const sourceId = Object.keys(store.state.Projects[projectId].sources).find(sourceId => sourceId === id)
    if (sourceId != null) {
      const source = cloneDeep(store.state.Projects[projectId].sources[sourceId])
      source.warning = warning
      return setDataSource(projectId, source)
    }
  }
}

function saveConnectionSettings (projectId, sourceId, timeoutMs, rateLimit, retryAttempts) {
  const source = cloneDeep(store.state.Projects[projectId].sources[sourceId])
  source.timeoutMs = timeoutMs
  source.rateLimit = rateLimit
  source.retryAttempts = retryAttempts
  return setDataSource(projectId, source)
}

function saveBaseMapConnectionSettings (id, timeoutMs, rateLimit, retryAttempts) {
  const baseMap = store.state.BaseMaps.baseMaps.find(baseMap => baseMap.id === id)
  if (baseMap != null) {
    const baseMapCopy = cloneDeep(baseMap)
    baseMapCopy.layerConfiguration.timeoutMs = timeoutMs
    baseMapCopy.layerConfiguration.rateLimit = rateLimit
    baseMapCopy.layerConfiguration.retryAttempts = retryAttempts
    return setBaseMap(baseMapCopy)
  }
}

export {
  setGeoPackage,
  setDataSource,
  setProjectName,
  showToolTips,
  setDataSourceDisplayName,
  addDataSources,
  setGeoPackageLayersVisible,
  setGeoPackageFeatureTableVisible,
  setGeoPackageTileTableVisible,
  _hasVisibleTables,
  renameGeoPackage,
  removeGeoPackage,
  renameFeatureTableColumn,
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
  addFeatureToGeoPackage,
  updateFeatureTable,
  removeFeatureFromGeoPackage,
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
  setConsent,
  setDarkTheme,
  notifyTab,
  clearNotification,
  clearNotifications,
  setMapZoom,
  setMapRenderingOrder,
  addBaseMap,
  setBaseMap,
  removeBaseMap,
  setSourceError,
  setSourceWarning,
  saveConnectionSettings,
  saveBaseMapConnectionSettings,
  clearStylingForFeature,
  deleteFeatureIdsFromGeoPackage,
  deleteFeatureIdsFromDataSource,
  popOutFeatureTable,
  updateGeoPackageFeatureTableColumnOrder,
  allowNotifications,
  addProjectState,
  setNominatimUrl,
  setOverpassUrl,
  setMapProjection,
  copyGeoPackageTable,
  renameGeoPackageTable,
  deleteGeoPackageTable
}
