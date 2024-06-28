import path from 'path'
import jetpack from 'fs-jetpack'
import isNil from 'lodash/isNil'
import keys from 'lodash/keys'
import cloneDeep from 'lodash/cloneDeep'
import { getLastModifiedDate } from '../../util/file/FileUtilities'
import { tryCollect } from '../../util/GarbageCollector'
import {
  getOrCreateGeoPackageForApp,
  getGeoPackageFeatureTableForApp,
  getGeoPackageFileSize,
  performSafeGeoPackageOperation,
  _getBoundingBoxForTable,
  _getGeoPackageFeatureTableForApp
} from '../../geopackage/GeoPackageCommon'
import {
  createFeatureTable,
  _deleteFeatureRow,
  _deleteFeatureRows,
  _renameGeoPackageFeatureTableColumn,
  _deleteGeoPackageFeatureTableColumn,
  _addGeoPackageFeatureTableColumn,
  _addFeatureToFeatureTable,
  _addGeoPackageFeatureTableColumns
} from '../../geopackage/GeoPackageFeatureTableUtilities'
import { _addMediaAttachment } from '../../geopackage/GeoPackageMediaUtilities'
import { sleep } from '../../util/common/CommonUtilities'


/**
 * Renames a GeoPackage file and saves in existing folder
 * @param gpPath
 * @param name
 * @return {Promise<{path: string, success: boolean, modifiedDate: null}>}
 **/

async function renameGeoPackage (gpPath, name) {
  tryCollect()
  await sleep(100)
  const newName = name + '.gpkg'
  const newPath = path.join(path.dirname(gpPath), newName)
  let renamed = false
  let retryAttempts = 0
  let modifiedDate = null
  // try to rename until the max attempts are reached
  while (!renamed && retryAttempts < 5) {
    try {
      await jetpack.renameAsync(gpPath, newName)
      modifiedDate = getLastModifiedDate(newPath)
      renamed = true
    } catch (e) {
      await sleep(100)
    }
    retryAttempts++
  }
  return {
    success: renamed,
    path: newPath,
    modifiedDate: modifiedDate
  }
}

/**
 * Rename a Column in a GeoPackage's Feature Table
 * @param geopackage
 * @param tableName
 * @param oldColumnName
 * @param newColumnName
 * @return {Promise<*>}
 */
async function renameGeoPackageFeatureTableColumn (geopackage, tableName, oldColumnName, newColumnName) {
  const existingTable = geopackage.tables.features[tableName]
  const filePath = geopackage.path
  return performSafeGeoPackageOperation(filePath, (gp) => {
    _renameGeoPackageFeatureTableColumn(gp, tableName, oldColumnName, newColumnName)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    updateGeoPackageFileInfo(geopackage)
    if (existingTable != null && existingTable.columnOrder != null) {
      const oldColumnIdx = existingTable.columnOrder.indexOf(oldColumnName.toLowerCase())
      if (oldColumnIdx !== -1) {
        existingTable.columnOrder.splice(oldColumnIdx, 1, newColumnName.toLowerCase())
      }
    }
    return updateExistingTable(existingTable, tableInfo, true, true)
  })
}

/**
 * Rename a Column in a DataSource's Feature Table
 * @param source
 * @param tableName
 * @param oldColumnName
 * @param newColumnName
 * @return {Promise<*>}
 */
async function renameDataSourceFeatureTableColumn (source, tableName, oldColumnName, newColumnName) {
  const filePath = source.geopackageFilePath
  return performSafeGeoPackageOperation(filePath, (gp) => {
    _renameGeoPackageFeatureTableColumn(gp, tableName, oldColumnName, newColumnName)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    if (source.table == null) {
      source.table = tableInfo
    }
    if (source.table.columnOrder != null) {
      const oldColumnIdx = source.table.columnOrder.indexOf(oldColumnName.toLowerCase())
      if (oldColumnIdx !== -1) {
        source.table.columnOrder.splice(oldColumnIdx, 1, newColumnName.toLowerCase())
      }
    }
    return updateExistingTable(source.table, tableInfo, true, true)
  })
}


async function deleteGeoPackageFeatureTableColumn (geopackage, tableName, columnName) {
  const existingTable = geopackage.tables.features[tableName]
  const filePath = geopackage.path
  return performSafeGeoPackageOperation(filePath, (gp) => {
    _deleteGeoPackageFeatureTableColumn(gp, tableName, columnName)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    updateGeoPackageFileInfo(geopackage)
    updateExistingTable(existingTable, tableInfo, true, true)
    return geopackage
  })
}

async function deleteDataSourceFeatureTableColumn (source, tableName, columnName) {
  const filePath = source.geopackageFilePath
  return performSafeGeoPackageOperation(filePath, (gp) => {
    _deleteGeoPackageFeatureTableColumn(gp, tableName, columnName)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    if (source.table == null) {
      source.table = tableInfo
    } else {
      updateExistingTable(source.table, tableInfo, true, true)
    }
    return source
  })
}

async function addGeoPackageFeatureTableColumn (geopackage, tableName, columnName, columnType) {
  let existingTable = geopackage.tables.features[tableName]
  const filePath = geopackage.path
  return performSafeGeoPackageOperation(filePath, (gp) => {
    _addGeoPackageFeatureTableColumn(gp, tableName, columnName, columnType)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    updateGeoPackageFileInfo(geopackage)
    updateExistingTable(existingTable, tableInfo, true, true)
    return geopackage
  })
}

async function addDataSourceFeatureTableColumn (source, tableName, columnName, columnType) {
  const filePath = source.geopackageFilePath
  return performSafeGeoPackageOperation(filePath, (gp) => {
    _addGeoPackageFeatureTableColumn(gp, tableName, columnName, columnType)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    source.table = updateExistingTable(source.table || {}, tableInfo, true, true)
    return source
  })
}

async function addFeatureTableToGeoPackage (geopackage, tableName, featureCollection) {
  const filePath = geopackage.path
  await createFeatureTable(filePath, tableName, featureCollection)
  const tableInfo = await getGeoPackageFeatureTableForApp(filePath, tableName)
  geopackage.size = getGeoPackageFileSize(filePath)
  geopackage.tables.features[tableName] = cloneDeep(tableInfo)
  geopackage.modifiedDate = getLastModifiedDate(geopackage.path)
  return geopackage
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
    table.styleKey = table.styleKey != null ? table.styleKey + 1 : 0
  }
  table.indexed = tableInfo.indexed
  if (updateColumnOrder) {
    table.columnOrder = validateColumnOrder(table.columnOrder, tableInfo.columnOrder)
  }
  return table
}

async function addFeatureToGeoPackage (geopackage, tableName, feature, columnsToAdd = []) {
  const existingTable = geopackage.tables.features[tableName]
  const filePath = geopackage.path
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
    return geopackage
  })
}

async function updateFeatureTable (geopackage, tableName) {
  const existingTable = geopackage.tables.features[tableName]
  const filePath = geopackage.path
  const tableInfo = await getGeoPackageFeatureTableForApp(filePath, tableName)
  updateGeoPackageFileInfo(geopackage)
  updateExistingTable(existingTable, tableInfo)
  return geopackage
}

function deleteFeatureIdsFromGeoPackage (geopackage, tableName, featureIds) {
  const existingTable = geopackage.tables.features[tableName]
  const filePath = geopackage.path
  return performSafeGeoPackageOperation(filePath, (gp) => {
    _deleteFeatureRows(gp, tableName, featureIds)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    updateGeoPackageFileInfo(geopackage)
    updateExistingTable(existingTable, tableInfo)
    return geopackage
  })
}

function deleteFeatureIdsFromDataSource (source, featureIds) {
  const filePath = source.geopackageFilePath
  return performSafeGeoPackageOperation(filePath, (gp) => {
    _deleteFeatureRows(gp, source.sourceLayerName, featureIds)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, source.sourceLayerName)
    if (tableInfo != null) {
      if (source.table == null) {
        source.table = tableInfo
      } else {
        updateExistingTable(source.table, tableInfo)
      }
      source.extent = tableInfo.extent
      source.count = tableInfo.featureCount
    }
    return source
  })
}

async function removeFeatureFromGeoPackage (geopackage, tableName, featureId) {
  const existingTable = geopackage.tables.features[tableName]
  const filePath = geopackage.path
  return performSafeGeoPackageOperation(filePath, (gp) => {
    _deleteFeatureRow(gp, tableName, featureId)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, tableName)
    updateGeoPackageFileInfo(geopackage)
    updateExistingTable(existingTable, tableInfo)
    return geopackage
  })
}

function removeFeatureFromDataSource (source, featureId) {
  const filePath = source.geopackageFilePath
  return performSafeGeoPackageOperation(filePath, (gp) => {
    _deleteFeatureRow(gp, source.sourceLayerName, featureId)
    const tableInfo = _getGeoPackageFeatureTableForApp(gp, source.sourceLayerName)
    if (tableInfo != null) {
      if (source.table == null) {
        source.table = tableInfo
      } else {
        updateExistingTable(source.table, tableInfo)
      }
      source.extent = tableInfo.extent
      source.count = tableInfo.featureCount
    }
    return source
  })
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


async function synchronizeGeoPackage (geopackageCopy) {
  return getOrCreateGeoPackageForApp(geopackageCopy.path).then(geopackage => {
    geopackage.id = geopackageCopy.id
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
    return geopackage
  })
}

async function synchronizeDataSource (sourceCopy) {
  const filePath = sourceCopy.geopackageFilePath
  return performSafeGeoPackageOperation(filePath, (gp) => {
    sourceCopy.extent = _getBoundingBoxForTable(gp, sourceCopy.sourceLayerName)
    sourceCopy.count = gp.getFeatureDao(sourceCopy.sourceLayerName).count()
    return sourceCopy
  })
}

export {
  renameGeoPackage,
  renameGeoPackageFeatureTableColumn,
  renameDataSourceFeatureTableColumn,
  deleteGeoPackageFeatureTableColumn,
  deleteDataSourceFeatureTableColumn,
  addGeoPackageFeatureTableColumn,
  addDataSourceFeatureTableColumn,
  addFeatureTableToGeoPackage,
  addFeatureToGeoPackage,
  updateFeatureTable,
  removeFeatureFromGeoPackage,
  removeFeatureFromDataSource,
  deleteFeatureIdsFromGeoPackage,
  deleteFeatureIdsFromDataSource,
  synchronizeGeoPackage,
  synchronizeDataSource
}
