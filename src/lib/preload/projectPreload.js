import path from 'path'
import fs from 'fs'
import jetpack from 'fs-jetpack'
import {clipboard, contextBridge, ipcRenderer, shell} from 'electron'
import log from 'electron-log'
import isNil from 'lodash/isNil'
import cloneDeep from 'lodash/cloneDeep'
import {
  Context,
  GeometryType,
  GeoPackageAPI,
  HtmlCanvasAdapter,
  SqliteAdapter,
  GeoPackageDataType,
} from '@ngageoint/geopackage'
import { exceedsFileSizeLimit, getMaxFileSizeString, getExtension } from '../util/MediaUtilities'
import {
  createNextAvailableBaseMapDirectory,
  createNextAvailableSourceDirectory,
  getExtraResourcesDirectory,
  readJSONFile
} from '../util/FileUtilities'
import CredentialsManagement from '../network/CredentialsManagement'
import { randomStyle, getDefaultIcon } from '../util/VectorStyleUtilities'
import {
  setDataSource,
  setProjectName,
  showToolTips,
  setDataSourceDisplayName,
  addDataSources,
  addGeoPackage,
  setGeoPackageLayersVisible,
  setGeoPackageFeatureTableVisible,
  setGeoPackageTileTableVisible,
  sleep,
  renameGeoPackage,
  removeGeoPackage,
  renameGeoPackageTileTable,
  copyGeoPackageTileTable,
  deleteGeoPackageTileTable,
  renameGeoPackageFeatureTable,
  copyGeoPackageFeatureTable,
  deleteGeoPackageFeatureTable,
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
  clearActiveLayers,
  zoomToExtent,
  setBoundingBoxFilter,
  setBoundingBoxFilterToExtent,
  setBoundingBoxFilterEditingEnabled,
  setBoundingBoxFilterEditingDisabled,
  clearBoundingBoxFilter,
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
  editFeatureGeometry,
  clearEditFeatureGeometry,
  setMapRenderingOrder,
  setPreviewLayer,
  clearPreviewLayer,
  addBaseMap,
  editBaseMap,
  removeBaseMap,
  setSourceError,
  saveConnectionSettings,
  saveBaseMapConnectionSettings
} from '../vue/vuex/ProjectActions'
import { deleteProject, setDataSourceVisible } from '../vue/vuex/CommonActions'
import { getOrCreateGeoPackage, getGeoPackageExtent, getBoundingBoxForTable, deleteGeoPackageTable, getTables, getGeoPackageFileSize, getDetails, isHealthy, normalizeLongitude, getExtentOfGeoPackageTables, checkGeoPackageHealth } from '../geopackage/GeoPackageCommon'
import { getFeaturesForTablesAtLatLngZoom } from '../geopackage/GeoPackageMapUtilities'
import { getAllFeatureRows, getFeatureRow, updateFeatureRow, featureExists, countOfFeaturesAt, getFeatureCountInBoundingBox, getFeatureColumns, indexFeatureTable, _createFeatureTable, getAllFeaturesAsGeoJSON, getBoundingBoxForFeature } from '../geopackage/GeoPackageFeatureTableUtilities'
import { estimatedTileCount } from '../geopackage/GeoPackageTileTableUtilities'
import {
  getMediaAttachmentsCounts,
  deleteMediaAttachment,
  getMediaRelationships,
  getMediaRow,
  getMediaObjectUrl
} from '../geopackage/GeoPackageMediaUtilities'
import { getStyleItemsForFeature, getStyleAssignmentForFeatures, _getTableStyle, _getTableIcon, _getStyleRows, _getIconRows } from '../geopackage/GeoPackageStyleUtilities'
import { createUniqueID } from '../util/UniqueIDUtilities'
import { getBaseUrlAndQueryParams, isXYZ, isWFS, isWMS, isArcGISFeatureService, isUrlValid, requiresSubdomains } from '../util/URLUtilities'
import { constructLayer } from '../layer/LayerFactory'
import { fixXYZTileServerUrlForLeaflet } from '../util/XYZTileUtilities'
import { getBaseURL, supportedImageFormats } from '../util/GeoServiceUtilities'
import Store from 'electron-store'
import { getWebMercatorBoundingBoxFromXYZ, tileIntersectsXYZ } from '../util/TileBoundingBoxUtils'
import moment from 'moment'
import orderBy from 'lodash/orderBy'
import isEmpty from 'lodash/isEmpty'
import { getDef } from '../projection/ProjectionUtilities'
import { GEOTIFF } from '../layer/LayerTypes'

function getUserDataDirectory () {
  return ipcRenderer.sendSync('get-user-data-directory')
}

log.transports.file.resolvePath = () => path.join(getUserDataDirectory(), 'logs', 'mapcache.log')
Object.assign(console, log.functions)
contextBridge.exposeInMainWorld('log', log.functions)


const IPC_EVENT_CONNECT = 'vuex-mutations-connect'
const IPC_EVENT_NOTIFY_MAIN = 'vuex-mutations-notify-main'
const IPC_EVENT_NOTIFY_RENDERERS = 'vuex-mutations-notify-renderers'

// if a user cancels inputting credentials, we will need to force a cancel of the the request
const cancelRequestURLToCallbackMap = {}
ipcRenderer.on('cancel-service-request', (event, url) => {
  if (cancelRequestURLToCallbackMap[url]) {
    cancelRequestURLToCallbackMap[url]()
  }
})

let storage

function determineAssignment (gp, tableName, geometryType) {
  const assignment = {
    icon: undefined,
    iconUrl: undefined,
    style: undefined
  }
  let style = _getTableStyle(gp, tableName, geometryType)
  let icon = _getTableIcon(gp, tableName, geometryType)
  if (!isNil(style)) {
    assignment.style = {
      id: style.id,
      name: style.getName(),
      description: style.getDescription(),
      color: style.getHexColor(),
      opacity: style.getOpacity(),
      fillColor: style.getFillHexColor(),
      fillOpacity: style.getFillOpacity(),
      width: style.getWidth()
    }
  }
  if (!isNil(icon)) {
    assignment.icon = {
      anchorU: icon.anchorU,
      anchorV: icon.anchorV,
      contentType: icon.contentType,
      data: icon.data,
      description: icon.description,
      height: icon.height,
      id: icon.id,
      name: icon.name,
      width: icon.description,
      url: 'data:' + icon.contentType + ';base64,' + Buffer.from(icon.data).toString('base64')
    }
  }
  return assignment
}

function createBaseMapDirectory () {
  return createNextAvailableBaseMapDirectory(getUserDataDirectory())
}

contextBridge.exposeInMainWorld('mapcache', {
  connect(payload) {
    ipcRenderer.send(IPC_EVENT_CONNECT, payload)
  },
  notifyMain(payload) {
    ipcRenderer.send(IPC_EVENT_NOTIFY_MAIN, payload)
  },
  onNotifyRenderers(handler) {
    ipcRenderer.on(IPC_EVENT_NOTIFY_RENDERERS, handler)
  },
  createStorage(name) {
    storage = new Store({ name: name })
  },
  getState(key) {
    return storage.get(key)
  },
  setState(key, state) {
    storage.set(key, state)
  },
  checkStorage(testKey) {
    try {
      storage.set(testKey, testKey)
      storage.get(testKey)
      storage.delete(testKey)
    } catch (error) {
      throw new Error("[Vuex Electron] Storage is not valid. Please, read the docs.")
    }
  },
  setupGeoPackgeContext: () => {
    Context.setupCustomContext(SqliteAdapter, HtmlCanvasAdapter)
  },
  getUserDataDirectory,
  getAppDataDirectory: () => {
    return ipcRenderer.sendSync('get-app-data-directory')
  },
  showOpenDialog: (options) => {
    return new Promise (resolve => {
      ipcRenderer.once('show-open-dialog-completed', (event, result) => {
        resolve(result)
      })
      ipcRenderer.send('show-open-dialog', options)
    })
  },
  showSaveDialog: (options) => {
    return new Promise (resolve => {
      ipcRenderer.once('show-save-dialog-completed', (event, result) => {
        resolve(result)
      })
      ipcRenderer.send('show-save-dialog', options)
    })
  },
  copyToClipboard: (text) => {
    clipboard.writeText(text)
  },
  getOfflineMap: () => {
    return readJSONFile(path.join(getExtraResourcesDirectory(), 'offline.json'))
  },
  getProjectionDefinition: (code) => {
    return getDef(code)
  },
  createBaseMapDirectory,
  createSourceDirectory: (projectDirectory) => {
    return createNextAvailableSourceDirectory(projectDirectory)
  },
  webRequest: (request) => {
    request.id = createUniqueID()
    return new Promise((resolve, reject) => {
      ipcRenderer.once('web-request-response-' + request.id, (event, response) => {
        if (response.error) {
          reject(response)
        } else {
          resolve(response)
        }
      })
      ipcRenderer.send('web-request', request)
    })
  },
  closeProject: () => {
    ipcRenderer.send('close-project')
  },
  cancelProcessingSource: (source) => {
    return new Promise(resolve => {
      ipcRenderer.removeAllListeners('process_source_completed_' + source.id)
      ipcRenderer.once('cancel_process_source_completed_' + source.id, resolve)
      ipcRenderer.send('cancel_process_source', source)
    })
  },
  attachMediaToGeoPackage: (data) => {
    return new Promise(resolve => {
      ipcRenderer.once('attach_media_completed_' + data.id, (event, success) => {
        resolve(success)
      })
      ipcRenderer.send('attach_media', data)
    })
  },
  removeMediaCompletedListener: (id) => {
    ipcRenderer.removeAllListeners('attach_media_completed_' + id)
  },
  downloadAttachment: async (filePath, geopackagePath, relatedTable, relatedId) => {
    const mediaRow = await getMediaRow(geopackagePath, relatedTable, relatedId)
    const extension = getExtension(mediaRow.contentType)
    let file = filePath
    if (extension !== false) {
      file = filePath + '.' + extension
    }
    await jetpack.writeAsync(file, mediaRow.data)
  },
  sendClientCredentials: (eventUrl, credentials) => {
    ipcRenderer.send('client-credentials-input', eventUrl, credentials)
  },
  sendCertificateSelection: (url, certificate) => {
    ipcRenderer.send('client-certificate-selected', url, certificate)
  },
  removeClosingProjectWindowListener: () => {
    ipcRenderer.removeAllListeners('closing-project-window')
  },
  removeSelectClientCertificateListener: () => {
    ipcRenderer.removeAllListeners('select-client-certificate')
  },
  removeRequestClientCredentialsListener: () => {
    ipcRenderer.removeAllListeners('request-client-credentials')
  },
  addTaskStatusListener: (id, callback) => {
    ipcRenderer.on('task-status-' + id, (event, args) => {
      callback(args)
    })
  },
  removeTaskStatusListener: (id) => {
    ipcRenderer.removeAllListeners('task-status-' + id)
  },
  addClosingProjectWindowListener: (callback) => {
    ipcRenderer.on('closing-project-window', (event, args) => {
      callback(args)
    })
  },
  addSelectClientCertificateListener: (callback) => {
    ipcRenderer.on('select-client-certificate', (event, args) => {
      callback(args)
    })
  },
  generateGeoTIFFRasterFile: (id, filePath, callback) => {
    ipcRenderer.once('generate_geotiff_raster_file_' + id, (event, args) => {
      callback(args)
    })
    ipcRenderer.send('generate_geotiff_raster_file', {
      id: id,
      filePath: filePath
    })
  },
  addRequestClientCredentialsListener: (callback) => {
    ipcRenderer.on('request-client-credentials', (event, args) => {
      callback(args)
    })
  },
  processSource: (data) => {
    ipcRenderer.send('process_source', data)
  },
  onceProcessSourceCompleted: (id) => {
    return new Promise(resolve => {
      ipcRenderer.once('process_source_completed_' + id, (event, result) => {
        resolve(result)
      })
    })
  },
  addFeatureLayer: (configuration, statusCallback) => {
    return new Promise(resolve => {
      ipcRenderer.once('build_feature_layer_completed_' + configuration.id, () => {
        ipcRenderer.removeAllListeners('build_feature_layer_status_' + configuration.id)
        resolve()
      })
      ipcRenderer.on('build_feature_layer_status_' + configuration.id, (event, status) => {
        statusCallback(status)
      })
      ipcRenderer.send('build_feature_layer', {configuration: configuration})
    })
  },
  cancelAddFeatureLayer: (configuration) => {
    return new Promise(resolve => {
      ipcRenderer.removeAllListeners('build_feature_layer_status_' + configuration.id)
      ipcRenderer.removeAllListeners('build_feature_layer_completed_' + configuration.id)
      ipcRenderer.once('cancel_build_feature_layer_completed_' + configuration.id, () => {
        resolve()
      })
      ipcRenderer.send('cancel_build_feature_layer', {configuration: configuration})
    })
  },
  addTileLayer: (configuration, statusCallback) => {
    return new Promise(resolve => {
      ipcRenderer.once('build_tile_layer_completed_' + configuration.id, () => {
        ipcRenderer.removeAllListeners('build_tile_layer_status_' + configuration.id)
        resolve()
      })
      ipcRenderer.on('build_tile_layer_status_' + configuration.id, (event, status) => {
        statusCallback(status)
      })
      ipcRenderer.send('build_tile_layer', {configuration: configuration})
    })
  },
  cancelAddTileLayer: (configuration) => {
    return new Promise(resolve => {
      ipcRenderer.removeAllListeners('build_tile_layer_status_' + configuration.id)
      ipcRenderer.removeAllListeners('build_tile_layer_completed_' + configuration.id)
      ipcRenderer.once('cancel_build_tile_layer_completed_' + configuration.id, () => {
        resolve()
      })
      ipcRenderer.send('cancel_build_tile_layer', {configuration: configuration})
    })
  },
  cancelTileRequest: (id) => {
    ipcRenderer.send('cancel_tile_request', {id: id})
    ipcRenderer.removeAllListeners('request_tile_' + id)
  },
  requestTile: (request) => {
    return new Promise(resolve => {
      ipcRenderer.once('request_tile_' + request.id, (event, result) => {
        resolve(result)
      })
      ipcRenderer.send('request_tile', request)
    })
  },
  registerServiceRequestCancelListener: (url, callback) => {
    cancelRequestURLToCallbackMap[url] = callback
  },
  unregisterServiceRequestCancelListener: (url) => {
    delete cancelRequestURLToCallbackMap[url]
  },
  async saveBaseMap (baseMapName, configuration, backgroundColor) {
    let layerConfiguration = {}

    // create a base map directory, the data source will be copied to this directory
    const baseMapId = createUniqueID()
    const baseMapDirectory = createBaseMapDirectory()

    // handle geopackage
    let extent = [-180, -90, 180, 90]
    if (!isNil(configuration.geopackage)) {
      const oldPath = configuration.geopackage.path
      const newPath = path.join(baseMapDirectory, path.basename(oldPath))
      await jetpack.copyAsync(oldPath, newPath, {overwrite: true})

      if (configuration.type === 'tile') {
        // create new geopackage and copy tile table
        const layer = constructLayer({id: baseMapId, directory: baseMapDirectory, sourceDirectory: baseMapDirectory, filePath: newPath, sourceLayerName: configuration.tableName, layerType: 'GeoPackage'})
        layerConfiguration = layer.configuration
        extent = await getGeoPackageExtent(newPath, configuration.tableName)
      } else {
        // create new geopackage and copy feature table
        const layer = constructLayer({id: baseMapId, directory: baseMapDirectory, sourceDirectory: baseMapDirectory, geopackageFilePath: newPath, sourceLayerName: configuration.tableName, sourceType: 'GeoPackage', layerType: 'Vector', maxFeatures: configuration.maxFeatures})
        layerConfiguration = layer.configuration
        extent = await getBoundingBoxForTable(newPath, configuration.tableName)
      }
    } else {
      // handle data source
      layerConfiguration = cloneDeep(configuration)
      layerConfiguration.id = baseMapId
      extent = layerConfiguration.extent || [-180, -90, 180, 90]
      await jetpack.copyAsync(layerConfiguration.directory, baseMapDirectory, {overwrite: true})
      const layerDirectory = layerConfiguration.directory
      layerConfiguration.directory = baseMapDirectory
      if (!isNil(layerConfiguration.filePath)) {
        layerConfiguration.filePath = configuration.filePath.replace(layerDirectory, baseMapDirectory)
      }
      if (!isNil(layerConfiguration.rasterFile)) {
        layerConfiguration.rasterFile = configuration.rasterFile.replace(layerDirectory, baseMapDirectory)
      }
      if (!isNil(configuration.geopackageFilePath)) {
        layerConfiguration.geopackageFilePath = configuration.geopackageFilePath.replace(layerDirectory, baseMapDirectory)
        extent = await getBoundingBoxForTable(layerConfiguration.geopackageFilePath, layerConfiguration.sourceLayerName)
      }
    }
    layerConfiguration.id = baseMapId

    return {
      id: baseMapId,
      directory: baseMapDirectory,
      name: baseMapName,
      background: backgroundColor,
      readonly: false,
      layerConfiguration: layerConfiguration,
      extent: extent
    }
  },
  getIconImageData: (file) => {
    const fileInfo = jetpack.inspect(file, {times: true, absolutePath: true})
    let extension = path.extname(fileInfo.absolutePath).slice(1)
    if (extension === 'jpg') {
      extension = 'jpeg'
    }
    let url = 'data:image/' + extension + ';base64,' + fs.readFileSync(fileInfo.absolutePath).toString('base64')
    return {extension, url}
  },
  getFileListInfo: (filePaths) => {
    const fileInfos = []
    for (const file of filePaths) {
      let fileInfo = jetpack.inspect(file, {
        times: true,
        absolutePath: true
      })
      fileInfo.lastModified = fileInfo.modifyTime.getTime()
      fileInfo.lastModifiedDate = fileInfo.modifyTime
      fileInfo.path = fileInfo.absolutePath
      fileInfos.push(fileInfo)
    }
    return fileInfos
  },
  fileExists: (filePath) => {
    return jetpack.exists(filePath)
  },
  isRasterMissing: (config) => {
    return config != null && config.layerType === GEOTIFF && (config.rasterFile == null || !jetpack.exists(config.rasterFile))
  },
  getExtensionName: (filePath) => {
    return path.extname(filePath)
  },
  getDirectoryName: (filePath) => {
    return path.dirname(filePath)
  },
  getBaseName: (filePath) => {
    return path.basename(filePath)
  },
  pathJoin: (...args) => {
    return path.join(...args)
  },
  showItemInFolder: (filePath) => {
    shell.showItemInFolder(filePath)
  },
  getFileInfo: (filePath) => {
    return jetpack.inspect(filePath, {
      times: true,
      absolutePath: true
    })
  },
  copyFile: (filePath, toFilePath) => {
    return new Promise(resolve => {
      fs.copyFile(filePath, toFilePath, resolve)
    })
  },
  getGeoPackageEditableColumnsForFeature: async (filePath, tableName, feature, columns) => {
    if (isNil(columns) || isNil(columns._columns)) {
      return []
    }
    const features = await getAllFeatureRows(filePath, tableName)
    const properties = isNil(feature) ? {} : cloneDeep(feature.properties)
    const columnObjects = columns._columns.filter(column => !column.primaryKey && !column.autoincrement && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id')
      .map((column) => {
      const columnObject = {
        name: column.name,
        lowerCaseName: column.name.toLowerCase(),
        dataType: column.dataType,
        index: column.index
      }
      let value = feature.properties[column.name]
      if (value === undefined || value === null) {
        value = column.defaultValue
      }
      if (isNil(properties[column.name]) && column.dataType === GeoPackageDataType.BOOLEAN) {
        value = false
      } else if (column.dataType === GeoPackageDataType.BOOLEAN) {
        value = properties[column.name] === 1 || properties[column.name] === true
      }
      if (column.dataType === GeoPackageDataType.DATETIME) {
        columnObject.dateMenu = false
        columnObject.showDate = true
        columnObject.timeMenu = false
        columnObject.showTime = true
        if (!isNil(value)) {
          try {
            const dateVal = moment.utc(value)
            value = new Date(value)
            columnObject.dateValue = dateVal.format('YYYY-MM-DD')
            columnObject.timeValue = dateVal.format('hh:mm:ss')
          } catch (e) {
            value = null
          }
        }
      }
      if (column.dataType === GeoPackageDataType.DATE) {
        columnObject.dateMenu = false
        columnObject.showDate = true
        if (!isNil(value)) {
          try {
            const dateVal = moment.utc(value)
            value = new Date(value)
            columnObject.dateValue = dateVal.format('YYYY-MM-DD')
          } catch (e) {
            value = null
          }
        }
      }
      columnObject.value = value
      if (!column.primaryKey && !column.autoincrement && column.dataType !== GeoPackageDataType.BLOB && column.name !== '_feature_id') {
        columnObject.rules = []
        if (column.notNull) {
          columnObject.rules.push(v => !!v || (column.lowerCaseName + ' is required'))
        }
        if (column.max) {
          columnObject.rules.push(v => v < column.max || (column.lowerCaseName + ' exceeds the max of ' + column.max))
        }
        if (column.min) {
          columnObject.rules.push(v => v < column.min || (column.lowerCaseName + ' is below the min of ' + column.min))
        }
        if (column.unique) {
          columnObject.rules.push(v => features.map(featureRow => featureRow.getValueWithIndex(column.index)).indexOf(v) !== -1 || column.name + ' must be unique')
        }
      }
      return columnObject
    })

    return orderBy(columnObjects, ['lowerCaseName'], ['asc'])
  },
  saveGeoPackageEditedFeature: async (filePath, tableName, feature, editableColumns) => {
    const featureRow = await getFeatureRow(filePath, tableName, feature.id)
    editableColumns.forEach(column => {
      let value = column.value
      if (column.dataType === GeoPackageDataType.BOOLEAN) {
        value = (value === 1 || value === true || value === 'true' || value === '1') ? 1 : 0
      }
      if (column.dataType === GeoPackageDataType.DATE) {
        try {
          if (!isEmpty(column.dateValue)) {
            value = new Date(column.dateValue).toISOString().substring(0, 10)
          } else {
            value = null
          }
        } catch (e) {
          value = null
        }
      }
      if (column.dataType === GeoPackageDataType.DATETIME) {
        try {
          const dateString = column.dateValue + ' ' + (isNil(column.timeValue) ? '00:00:00' : column.timeValue)
          if (!isEmpty(dateString)) {
            value = moment.utc(dateString).toISOString()
          } else {
            value = null
          }
        } catch (e) {
          value = null
        }
      }
      featureRow.setValueNoValidationWithIndex(column.index, value)
    })
   return await updateFeatureRow(filePath, tableName, featureRow)
  },
  encryptPassword: CredentialsManagement.encrypt,
  randomStyle: randomStyle,
  getDefaultIcon: getDefaultIcon,
  getGeoPackageFeatureTableStyleData: async (filePath, tableName) => {
    const result = {}
    result.styleRows = []
    result.iconRows = []
    result.pointAssignment = null
    result.lineAssignment = null
    result.polygonAssignment = null
    result.multipointAssignment = null
    result.multilineAssignment = null
    result.multipolygonAssignment = null
    result.geometryCollectionAssignment = null
    result.hasStyleExtension = false
    let gp
    try {
      gp = await GeoPackageAPI.open(filePath)
      result.hasStyleExtension = gp.featureStyleExtension.has(tableName)
      if (result.hasStyleExtension) {
        result.styleRows = Object.values(_getStyleRows(gp, tableName))
        result.iconRows = Object.values(_getIconRows(gp, tableName))
        if (result.styleRows.length + result.iconRows.length > 0) {
          result.pointAssignment = determineAssignment(gp, tableName, GeometryType.POINT)
          result.lineAssignment = determineAssignment(gp, tableName, GeometryType.LINESTRING)
          result.polygonAssignment = determineAssignment(gp, tableName, GeometryType.POLYGON)
          result.multipointAssignment = determineAssignment(gp, tableName, GeometryType.MULTIPOINT)
          result.multilineAssignment = determineAssignment(gp, tableName, GeometryType.MULTILINESTRING)
          result.multipolygonAssignment = determineAssignment(gp, tableName, GeometryType.MULTIPOLYGON)
          result.geometryCollectionAssignment = determineAssignment(gp, tableName, GeometryType.GEOMETRYCOLLECTION)
        }
      }
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get GeoPackage style.')
    } finally {
      try {
        gp.close()
        gp = undefined
        // eslint-disable-next-line no-unused-vars
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to close GeoPackage.')
      }
    }
    return result
  },
  hasStyleExtension: async (path, tableName) => {
    let hasStyle = false
    let gp
    try {
      gp = await GeoPackageAPI.open(path)
      hasStyle = gp.featureStyleExtension.has(tableName)
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to determine if style extension is enabled.')
    }
    try {
      gp.close()
      gp = undefined
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to close geopackage.')
    }
    return hasStyle
  },
  createGeoPackageWithFeatureTable: (projectId, filePath, featureTableName, featureCollection) =>{
    getOrCreateGeoPackage(filePath).then(gp => {
      _createFeatureTable(gp, featureTableName, featureCollection, true).then(() => {
        addGeoPackage({projectId: projectId, filePath: filePath})
      }).catch(() => {
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
      })
    })
  },
  GeometryType: {
    GEOMETRY: GeometryType.GEOMETRY,
    POINT: GeometryType.POINT,
    LINESTRING: GeometryType.LINESTRING,
    POLYGON: GeometryType.POLYGON,
    MULTIPOINT: GeometryType.MULTIPOINT,
    MULTILINESTRING: GeometryType.MULTILINESTRING,
    MULTIPOLYGON: GeometryType.MULTIPOLYGON,
    GEOMETRYCOLLECTION: GeometryType.GEOMETRYCOLLECTION,
    CIRCULARSTRING: GeometryType.CIRCULARSTRING,
    COMPOUNDCURVE: GeometryType.COMPOUNDCURVE,
    CURVEPOLYGON: GeometryType.CURVEPOLYGON,
    MULTICURVE: GeometryType.MULTICURVE,
    MULTISURFACE: GeometryType.MULTISURFACE,
    CURVE: GeometryType.CURVE,
    SURFACE: GeometryType.SURFACE,
    POLYHEDRALSURFACE: GeometryType.POLYHEDRALSURFACE,
    TIN: GeometryType.TIN,
    TRIANGLE: GeometryType.TRIANGLE,
    fromName: GeometryType.fromName,
    nameFromType: GeometryType.nameFromType
  },
  GeoPackageDataType: {
    BOOLEAN: GeoPackageDataType.BOOLEAN,
    TINYINT: GeoPackageDataType.TINYINT,
    SMALLINT: GeoPackageDataType.SMALLINT,
    MEDIUMINT: GeoPackageDataType.MEDIUMINT,
    INT: GeoPackageDataType.INT,
    INTEGER: GeoPackageDataType.INTEGER,
    FLOAT: GeoPackageDataType.FLOAT,
    DOUBLE: GeoPackageDataType.DOUBLE,
    REAL: GeoPackageDataType.REAL,
    TEXT: GeoPackageDataType.TEXT,
    BLOB: GeoPackageDataType.BLOB,
    DATE: GeoPackageDataType.DATE,
    DATETIME: GeoPackageDataType.DATETIME,
    fromName: GeoPackageDataType.fromName,
    nameFromType: GeoPackageDataType.nameFromType
  },
  getOrCreateGeoPackage,
  getGeoPackageExtent,
  getBoundingBoxForTable,
  deleteGeoPackageTable,
  getTables,
  getGeoPackageFileSize,
  getDetails,
  isHealthy,
  normalizeLongitude,
  getExtentOfGeoPackageTables,
  checkGeoPackageHealth,
  estimatedTileCount,
  exceedsFileSizeLimit,
  getMaxFileSizeString,
  getStyleItemsForFeature,
  getStyleAssignmentForFeatures,
  fixXYZTileServerUrlForLeaflet,
  getBaseURL,
  supportedImageFormats,
  createUniqueID,
  tileIntersectsXYZ,
  getWebMercatorBoundingBoxFromXYZ,
  deleteProject,
  setDataSourceVisible,
  getBaseUrlAndQueryParams,
  isXYZ,
  isWFS,
  isWMS,
  isArcGISFeatureService,
  isUrlValid,
  requiresSubdomains,
  getFeaturesForTablesAtLatLngZoom,
  getFeatureRow,
  featureExists,
  countOfFeaturesAt,
  getFeatureCountInBoundingBox,
  getFeatureColumns,
  indexFeatureTable,
  getAllFeaturesAsGeoJSON,
  getMediaAttachmentsCounts,
  deleteMediaAttachment,
  getMediaRelationships,
  setDataSource,
  setProjectName,
  showToolTips,
  setDataSourceDisplayName,
  addDataSources,
  addGeoPackage,
  setGeoPackageLayersVisible,
  setGeoPackageFeatureTableVisible,
  setGeoPackageTileTableVisible,
  sleep,
  renameGeoPackage,
  removeGeoPackage,
  renameGeoPackageTileTable,
  copyGeoPackageTileTable,
  deleteGeoPackageTileTable,
  renameGeoPackageFeatureTable,
  copyGeoPackageFeatureTable,
  deleteGeoPackageFeatureTable,
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
  clearActiveLayers,
  zoomToExtent,
  setBoundingBoxFilter,
  setBoundingBoxFilterToExtent,
  setBoundingBoxFilterEditingEnabled,
  setBoundingBoxFilterEditingDisabled,
  clearBoundingBoxFilter,
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
  editFeatureGeometry,
  clearEditFeatureGeometry,
  setMapRenderingOrder,
  setPreviewLayer,
  clearPreviewLayer,
  addBaseMap,
  editBaseMap,
  removeBaseMap,
  setSourceError,
  saveConnectionSettings,
  saveBaseMapConnectionSettings,
  getBoundingBoxForFeature,
  getMediaObjectUrl
})
