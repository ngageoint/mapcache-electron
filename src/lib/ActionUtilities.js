import path from 'path'
import fs from 'fs'
import _ from 'lodash'
import FileUtilities from './FileUtilities'
import GeoPackageUtilities from './GeoPackageUtilities'
import store from '../store'

/**
 * ActionUtilities is a helper class for performing actions prior to updating the store
 */
export default class ActionUtilities {
  static newProject ({id}) {
    store.dispatch('Projects/newProject', {id})
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

  static renameGeoPackage ({projectId, geopackageId, name}) {
    const geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[geopackageId])
    const oldPath = geopackage.path
    const newPath = path.join(path.dirname(oldPath), name + '.gpkg')
    fs.renameSync(oldPath, newPath)
    geopackage.path = newPath
    geopackage.name = name
    geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
    store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
  }

  static copyGeoPackage ({projectId, geopackageId, name}) {
    const oldPath = store.state.Projects[projectId].geopackages[geopackageId].path
    const newPath = path.join(path.dirname(oldPath), name + '.gpkg')
    fs.copyFileSync(oldPath, newPath)
    GeoPackageUtilities.getOrCreateGeoPackageForApp(newPath).then(geopackage => {
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
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

  static setFeatureStyle ({projectId, id, tableName, featureId, styleId, isGeoPackage}) {
    const filePath = isGeoPackage ? store.state.Projects[projectId].geopackages[id].path : store.state.Projects[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.setFeatureStyle(filePath, tableName, featureId, styleId).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage)
    })
  }

  static setFeatureIcon ({projectId, id, tableName, featureId, iconId, isGeoPackage}) {
    const filePath = isGeoPackage ? store.state.Projects[projectId].geopackages[id].path : store.state.Projects[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.setFeatureIcon(filePath, tableName, featureId, iconId).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage)
    })
  }

  static setTableStyle ({projectId, id, tableName, geometryType, styleId, isGeoPackage}) {
    const filePath = isGeoPackage ? store.state.Projects[projectId].geopackages[id].path : store.state.Projects[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.setTableStyle(filePath, tableName, geometryType, styleId).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage)
    })
  }

  static setTableIcon ({projectId, id, tableName, geometryType, iconId, isGeoPackage}) {
    const filePath = isGeoPackage ? store.state.Projects[projectId].geopackages[id].path : store.state.Projects[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.setTableIcon(filePath, tableName, geometryType, iconId).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage)
    })
  }

  static createStyleRow ({projectId, id, tableName, isGeoPackage, style}) {
    const filePath = isGeoPackage ? store.state.Projects[projectId].geopackages[id].path : store.state.Projects[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.createStyleRow(filePath, tableName, style).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage)
    })
  }

  static createIconRow ({projectId, id, tableName, isGeoPackage, icon}) {
    const filePath = isGeoPackage ? store.state.Projects[projectId].geopackages[id].path : store.state.Projects[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.createIconRow(filePath, tableName, icon).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage)
    })
  }

  static updateStyleRow ({projectId, id, tableName, styleRow, isGeoPackage}) {
    const filePath = isGeoPackage ? store.state.Projects[projectId].geopackages[id].path : store.state.Projects[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.updateStyleRow(filePath, tableName, styleRow).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage)
    })
  }

  static updateIconRow ({projectId, id, tableName, iconRow, isGeoPackage}) {
    const filePath = isGeoPackage ? store.state.Projects[projectId].geopackages[id].path : store.state.Projects[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.updateIconRow(filePath, tableName, iconRow).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage)
    })
  }

  static deleteStyleRow ({projectId, id, tableName, styleId, isGeoPackage}) {
    const filePath = isGeoPackage ? store.state.Projects[projectId].geopackages[id].path : store.state.Projects[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.deleteStyleRow(filePath, tableName, styleId).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage)
    })
  }

  static deleteIconRow ({projectId, id, tableName, iconId, isGeoPackage}) {
    const filePath = isGeoPackage ? store.state.Projects[projectId].geopackages[id].path : store.state.Projects[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.deleteIconRow(filePath, tableName, iconId).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage)
    })
  }

  static addStyleExtensionForTable ({projectId, id, tableName, isGeoPackage}) {
    const filePath = isGeoPackage ? store.state.Projects[projectId].geopackages[id].path : store.state.Projects[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.addStyleExtensionForTable(filePath, tableName).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage)
    })
  }

  static removeStyleExtensionForTable ({projectId, id, tableName, isGeoPackage}) {
    const filePath = isGeoPackage ? store.state.Projects[projectId].geopackages[id].path : store.state.Projects[projectId].sources[id].geopackageFilePath
    GeoPackageUtilities.removeStyleExtensionForTable(filePath, tableName).then(function () {
      ActionUtilities.updateStyleKey(projectId, id, tableName, isGeoPackage)
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
      store.dispatch('Projects/setGeoPackage', {projectId, source: sourceCopy})
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
    store.dispatch('Projects/deleteProject', {project})
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

  static setBoundingBoxFilterEditingEnabled ({projectId, enabled}) {
    store.dispatch('Projects/setBoundingBoxFilterEditingEnabled', {projectId, enabled})
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
    store.dispatch('Projects/setActiveGeoPackageFeatureLayer', {projectId, geopackageId, tableName})
  }

  static updateStyleKey (projectId, id, tableName, isGeoPackage) {
    if (isGeoPackage) {
      const geopackage = _.cloneDeep(store.state.Projects[projectId].geopackages[id])
      geopackage.modifiedDate = FileUtilities.getLastModifiedDate(geopackage.path)
      if (geopackage.tables.features[tableName]) {
        geopackage.tables.features[tableName].styleKey = geopackage.tables.features[tableName].styleKey + 1
      } else if (geopackage.tables.tiles[tableName]) {
        geopackage.tables.tiles[tableName].styleKey = geopackage.tables.tiles[tableName].styleKey + 1
      }
      store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    } else {
      const source = _.cloneDeep(store.state.Projects[projectId].sources[id])
      source.styleKey = source.styleKey + 1
      store.dispatch('Projects/setDataSource', {projectId, source})
    }
  }

  static setDarkTheme ({projectId, enabled}) {
    store.dispatch('UIState/setDarkTheme', {projectId, enabled})
  }
}
