import path from 'path'
import fs from 'fs'
import jetpack from 'fs-jetpack'
import log from 'electron-log/renderer'
import isNil from 'lodash/isNil'
import cloneDeep from 'lodash/cloneDeep'
import CredentialsManagement from '../main/lib/auth/CredentialsManagement'
import { contextBridge, ipcRenderer, clipboard, shell } from 'electron'
import { parseStringPromise } from 'xml2js'
import { Context, GeometryType, HtmlCanvasAdapter, SqliteAdapter, GeoPackageDataType } from '@ngageoint/geopackage'
import { exceedsFileSizeLimit, getMaxFileSizeString } from '../lib/util/media/MediaUtilities'
import { createNextAvailableBaseMapDirectory, createNextAvailableSourceDirectory, exists, rmDirAsync, createNextAvailableLayerDirectory, isDirEmpty, getLastModifiedDate } from '../lib/util/file/FileUtilities'
import { getDefaultIcon } from '../lib/util/style/NodeStyleUtilities'
import { getGeoPackageExtent, getBoundingBoxForTable, getTables, getGeoPackageFileSize, getDetails, isHealthy, normalizeLongitude, getExtentOfGeoPackageTables, checkGeoPackageHealth, getGeoPackageFeatureTableForApp, getOrCreateGeoPackageForApp } from '../lib/geopackage/GeoPackageCommon'
import { featureExists, getFeatureCountInBoundingBox, getFeatureColumns, indexFeatureTable, getBoundingBoxForFeature, getLayerColumns, getFeatureCount, getFeatureTablePage, getGeoPackageEditableColumnsForFeature, saveGeoPackageEditedFeature, getEditableColumnObject, getClosestFeature, getFeatureViewData } from '../lib/geopackage/GeoPackageFeatureTableUtilities'
import { deleteMediaAttachment, getMediaRelationships, getMediaObjectUrl, getFeatureImageObjectUrl, downloadAttachment } from '../lib/geopackage/GeoPackageMediaUtilities'
import {
  getStyleItemsForFeature,
  getStyleDrawOverlap,
  hasStyleExtension,
  getGeoPackageFeatureTableStyleData,
  getIconImageData,
  getFeatureStyleOrIcon,
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
  removeStyleExtensionForTable,
  addStyleExtensionForTable,
  clearStylingForFeature
} from '../lib/geopackage/GeoPackageStyleUtilities'
import { createUniqueID } from '../lib/util/UniqueIDUtilities'
import { getBaseUrlAndQueryParams, isXYZ, isWFS, isWMS, isArcGISFeatureService, isUrlValid, requiresSubdomains, isWMTS } from '../lib/network/URLUtilities'
import { constructLayer } from '../lib/layer/LayerFactory'
import { fixXYZTileServerUrlForLeaflet } from '../lib/util/xyz/XYZTileUtilities'
import { getBaseURL, supportedImageFormats } from '../lib/util/geoserver/GeoServiceUtilities'
import { getWebMercatorBoundingBoxFromXYZ, tileIntersectsXYZ } from '../lib/util/tile/TileBoundingBoxUtils'
import { getMetersPerUnit, getUnits, convertToWebMercator, reprojectBoundingBox } from '../lib/projection/ProjectionUtilities'
import { GEOTIFF } from '../lib/layer/LayerTypes'
import { ATTACH_MEDIA, ATTACH_MEDIA_COMPLETED, BUILD_FEATURE_LAYER, BUILD_FEATURE_LAYER_COMPLETED, BUILD_FEATURE_LAYER_STATUS, BUILD_TILE_LAYER, BUILD_TILE_LAYER_COMPLETED, BUILD_TILE_LAYER_STATUS, CANCEL_BUILD_FEATURE_LAYER, CANCEL_BUILD_FEATURE_LAYER_COMPLETED, CANCEL_BUILD_TILE_LAYER, CANCEL_BUILD_TILE_LAYER_COMPLETED, CANCEL_PROCESS_SOURCE, CANCEL_PROCESS_SOURCE_COMPLETED, CANCEL_SERVICE_REQUEST, CANCEL_TILE_REQUEST, CLIENT_CERTIFICATE_SELECTED, CLIENT_CREDENTIALS_INPUT, CLOSE_PROJECT, CLOSING_PROJECT_WINDOW, FEATURE_TABLE_ACTION, FEATURE_TABLE_EVENT, GENERATE_GEOTIFF_RASTER_FILE, GENERATE_GEOTIFF_RASTER_FILE_COMPLETED, GET_APP_DATA_DIRECTORY, GET_USER_DATA_DIRECTORY, HIDE_FEATURE_TABLE_WINDOW, LOAD_OR_DISPLAY_GEOPACKAGES, OPEN_EXTERNAL, PROCESS_SOURCE, PROCESS_SOURCE_COMPLETED, PROCESS_SOURCE_STATUS, REQUEST_CLIENT_CREDENTIALS, REQUEST_GEOPACKAGE_TABLE_COPY, REQUEST_GEOPACKAGE_TABLE_COPY_COMPLETED, REQUEST_GEOPACKAGE_TABLE_COUNT, REQUEST_GEOPACKAGE_TABLE_COUNT_COMPLETED, REQUEST_GEOPACKAGE_TABLE_SEARCH, REQUEST_GEOPACKAGE_TABLE_SEARCH_COMPLETED, REQUEST_GEOPACKAGE_TABLE_DELETE, REQUEST_GEOPACKAGE_TABLE_DELETE_COMPLETED, REQUEST_GEOPACKAGE_TABLE_RENAME, REQUEST_GEOPACKAGE_TABLE_RENAME_COMPLETED, REQUEST_TILE, REQUEST_TILE_COMPLETED, SELECT_CLIENT_CERTIFICATE, SHOW_FEATURE_TABLE_WINDOW, LAUNCH_USER_GUIDE, SEND_WINDOW_TO_FRONT, UNDO, REDO, CANCEL_TILE_COMPILATION_REQUEST, REQUEST_TILE_COMPILATION_COMPLETED, REQUEST_TILE_COMPILATION, WEB_VIEW_AUTH_REQUEST, WEB_VIEW_AUTH_RESPONSE, WEB_VIEW_AUTH_CANCEL, GET_APP_VERSION } from '../main/lib/ipc/MapCacheIPC'
import { convertPbfToDataUrl } from '../lib/util/rendering/MBTilesUtilities'
import { showOpenDialog, showSaveDialog } from '../main/lib/dialog/DialogUtilities'
import { vuexElectronAPI } from './vuexPreload'
import { deleteProjectFolder } from '../lib/vue/vuex/CommonPreloadFunctions'
import {
  addDataSourceFeatureTableColumn,
  addFeatureTableToGeoPackage,
  addFeatureToGeoPackage,
  addGeoPackageFeatureTableColumn,
  deleteDataSourceFeatureTableColumn,
  deleteFeatureIdsFromDataSource,
  deleteFeatureIdsFromGeoPackage,
  deleteGeoPackageFeatureTableColumn,
  removeFeatureFromDataSource,
  removeFeatureFromGeoPackage,
  renameDataSourceFeatureTableColumn,
  renameGeoPackage,
  renameGeoPackageFeatureTableColumn,
  synchronizeDataSource,
  synchronizeGeoPackage,
  updateFeatureTable
} from '../lib/vue/vuex/ProjectPreloadFunctions'
import { LAYER_DIRECTORY_IDENTIFIER } from '../lib/util/file/FileConstants'
import offlineGeoPackagePath from '../../resources/offline.gpkg?asset'

function getUserDataDirectory () {
  return ipcRenderer.sendSync(GET_USER_DATA_DIRECTORY)
}

/**
 * Handles writing data to a writable stream
 * @param writable
 * @param data
 * @param callback
 */
function write (writable, data, callback) {
  writable.write(data, callback)
}

Object.assign(console, log.functions)
contextBridge.exposeInMainWorld('log', log.functions)
contextBridge.exposeInMainWorld('vuex', vuexElectronAPI)

// if a user cancels inputting credentials, we will need to force a cancel of the request
const cancelRequestURLToCallbackMap = {}
ipcRenderer.on(CANCEL_SERVICE_REQUEST, (event, url) => {
  if (cancelRequestURLToCallbackMap[url]) {
    cancelRequestURLToCallbackMap[url]()
  }
})

let fileStreams = {}
let webViewAuthListener = null
let webViewAuthResponseListener = null

function createBaseMapDirectory () {
  return createNextAvailableBaseMapDirectory(getUserDataDirectory())
}

contextBridge.exposeInMainWorld('mapcache', {
  registerAuthRequestListener(listener) {
    webViewAuthListener = listener
  },
  registerAuthResponseListener(listener) {
    webViewAuthResponseListener = listener
  },
  cancelWebViewAuthRequest () {
    ipcRenderer.send(WEB_VIEW_AUTH_CANCEL)
  },
  async sendWebViewAuthRequest (url) {
    return new Promise((resolve, reject) => {
      if (webViewAuthListener != null) {
        webViewAuthListener(url)
      }
      ipcRenderer.send(WEB_VIEW_AUTH_REQUEST, url)
      ipcRenderer.on(WEB_VIEW_AUTH_RESPONSE, (event, response) => {
        if (webViewAuthResponseListener != null) {
          webViewAuthResponseListener()
        }
        if (response && response.error) {
          reject(response.error)
        } else {
          resolve()
        }
      })
    })
  },
  setupGeoPackageContext: () => {
    Context.setupCustomContext(SqliteAdapter, HtmlCanvasAdapter)
  },
  getUserDataDirectory,
  openFileStream: (path) => {
    const id = createUniqueID()
    fileStreams[id] = fs.createWriteStream(path, { flags: 'a' })
    return id
  },
  getAppVersion: () => {
    return ipcRenderer.sendSync(GET_APP_VERSION)
  },
  appendToStream: async (streamId, data) => {
    return new Promise(resolve => {
      if (streamId != null && fileStreams[streamId] != null) {
        write(fileStreams[streamId], data, resolve)
      } else {
        resolve()
      }
    })
  },
  closeFileStream: (streamId) => {
    const stream = fileStreams[streamId]
    if (stream != null) {
      stream.end()
      delete fileStreams[streamId]
    }
  },
  convertXMLtoJSON: async (xml) => {
    return await parseStringPromise(xml, {trim: true}).then(json => {
      return json
    }).catch(e => {
      return null
    })
  },
  generateJsonFilePath: (filePath, id) => {
    return path.join(filePath, id + '.json')
  },
  getAppDataDirectory: () => {
    return ipcRenderer.sendSync(GET_APP_DATA_DIRECTORY)
  },
  showOpenDialog,
  showSaveDialog,
  copyToClipboard: (text) => {
    clipboard.writeText(text)
  },
  getOfflineGeoPackageFilePath: () => {
      if(!process.env.NODE_ENV || process.env.NODE_ENV === "production"){
        // Prod access to offline gkpg is in extraResources after bundling
        const gpkgPath = path.join(process.resourcesPath, 'extraResources', 'offline.gpkg')
        return gpkgPath
      }
    return offlineGeoPackagePath
  },
  createSourceDirectory: (projectDirectory) => {
    return createNextAvailableSourceDirectory(projectDirectory)
  },
  createNextAvailableLayerDirectory: (sourceDirectory) => {
    return createNextAvailableLayerDirectory(sourceDirectory)
  },
  deleteSourceDirectory: async (source) => {
    if (source.directory && exists(source.directory)) {
      try {
        await rmDirAsync(source.directory)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Unable to remove source directory')
      }
    }
    if (source.sourceDirectory && exists(source.sourceDirectory) && isDirEmpty(path.join(source.sourceDirectory, LAYER_DIRECTORY_IDENTIFIER))) {
      try {
        await rmDirAsync(source.sourceDirectory)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to remove source directory: ' + source.sourceDirectory)
      }
    }
  },
  deleteBaseMapDirectory: async (baseMap) => {
    return rmDirAsync(baseMap.directory)
  },
  closeProject: () => {
    ipcRenderer.send(CLOSE_PROJECT)
  },
  cancelProcessingSource: async (source) => {
    return new Promise(resolve => {
      ipcRenderer.removeAllListeners(PROCESS_SOURCE_COMPLETED(source.id))
      ipcRenderer.once(CANCEL_PROCESS_SOURCE_COMPLETED(source.id), resolve)
      ipcRenderer.send(CANCEL_PROCESS_SOURCE, source)
    })
  },
  attachMediaToGeoPackage: async (data) => {
    return new Promise(resolve => {
      ipcRenderer.once(ATTACH_MEDIA_COMPLETED(data.id), (event, success) => {
        resolve(success)
      })
      ipcRenderer.send(ATTACH_MEDIA, data)
    })
  },
  removeMediaCompletedListener: (id) => {
    ipcRenderer.removeAllListeners(ATTACH_MEDIA_COMPLETED(id))
  },
  sendClientCredentials: (eventUrl, credentials) => {
    ipcRenderer.send(CLIENT_CREDENTIALS_INPUT, eventUrl, credentials)
  },
  sendCertificateSelection: (url, certificate) => {
    ipcRenderer.send(CLIENT_CERTIFICATE_SELECTED, url, certificate)
  },
  removeClosingProjectWindowListener: () => {
    ipcRenderer.removeAllListeners(CLOSING_PROJECT_WINDOW)
  },
  removeSelectClientCertificateListener: () => {
    ipcRenderer.removeAllListeners(SELECT_CLIENT_CERTIFICATE)
  },
  removeRequestClientCredentialsListener: () => {
    ipcRenderer.removeAllListeners(REQUEST_CLIENT_CREDENTIALS)
  },
  removeLoadOrDisplayGeoPackageListener: () => {
    ipcRenderer.removeAllListeners(LOAD_OR_DISPLAY_GEOPACKAGES)
  },
  addTaskStatusListener: (id, callback) => {
    ipcRenderer.on(PROCESS_SOURCE_STATUS(id), (event, args) => {
      callback(args)
    })
  },
  removeTaskStatusListener: (id) => {
    ipcRenderer.removeAllListeners(PROCESS_SOURCE_STATUS(id))
  },
  addLoadOrDisplayGeoPackageListener: (callback) => {
    ipcRenderer.on(LOAD_OR_DISPLAY_GEOPACKAGES, (event, geopackageIds, filePaths) => {
      callback(geopackageIds, filePaths)
    })
  },
  addClosingProjectWindowListener: (callback) => {
    ipcRenderer.on(CLOSING_PROJECT_WINDOW, (event, args) => {
      callback(args)
    })
  },
  addSelectClientCertificateListener: (callback) => {
    ipcRenderer.on(SELECT_CLIENT_CERTIFICATE, (event, args) => {
      callback(args)
    })
  },
  generateGeoTIFFRasterFile: (id, filePath, callback) => {
    ipcRenderer.once(GENERATE_GEOTIFF_RASTER_FILE_COMPLETED(id), (event, args) => {
      callback(args)
    })
    ipcRenderer.send(GENERATE_GEOTIFF_RASTER_FILE, {
      id: id,
      filePath: filePath
    })
  },
  addRequestClientCredentialsListener: (callback) => {
    ipcRenderer.on(REQUEST_CLIENT_CREDENTIALS, (event, args) => {
      callback(args)
    })
  },
  processSource: (data) => {
    ipcRenderer.send(PROCESS_SOURCE, data)
  },
  onceProcessSourceCompleted: async (id) => {
    return new Promise(resolve => {
      ipcRenderer.once(PROCESS_SOURCE_COMPLETED(id), (event, result) => {
        resolve(result)
      })
    })
  },
  addFeatureLayer: async (configuration, statusCallback) => {
    return new Promise(resolve => {
      ipcRenderer.once(BUILD_FEATURE_LAYER_COMPLETED(configuration.id), () => {
        ipcRenderer.removeAllListeners(BUILD_FEATURE_LAYER_STATUS(configuration.id))
        resolve()
      })
      ipcRenderer.on(BUILD_FEATURE_LAYER_STATUS(configuration.id), (event, status) => {
        statusCallback(status)
      })
      ipcRenderer.send(BUILD_FEATURE_LAYER, { configuration: configuration })
    })
  },
  cancelAddFeatureLayer: async (configuration) => {
    return new Promise(resolve => {
      ipcRenderer.removeAllListeners(BUILD_FEATURE_LAYER_STATUS(configuration.id))
      ipcRenderer.removeAllListeners(BUILD_FEATURE_LAYER_COMPLETED(configuration.id))
      ipcRenderer.once(CANCEL_BUILD_FEATURE_LAYER_COMPLETED(configuration.id), () => {
        resolve()
      })
      ipcRenderer.send(CANCEL_BUILD_FEATURE_LAYER, { configuration: configuration })
    })
  },
  addTileLayer: async (configuration, statusCallback) => {
    return new Promise(resolve => {
      ipcRenderer.once(BUILD_TILE_LAYER_COMPLETED(configuration.id), () => {
        ipcRenderer.removeAllListeners(BUILD_TILE_LAYER_STATUS(configuration.id))
        resolve()
      })
      ipcRenderer.on(BUILD_TILE_LAYER_STATUS(configuration.id), (event, status) => {
        statusCallback(status)
      })
      ipcRenderer.send(BUILD_TILE_LAYER, { configuration: configuration })
    })
  },
  cancelAddTileLayer: async (configuration) => {
    return new Promise(resolve => {
      ipcRenderer.removeAllListeners(BUILD_TILE_LAYER_STATUS(configuration.id))
      ipcRenderer.removeAllListeners(BUILD_TILE_LAYER_COMPLETED(configuration.id))
      ipcRenderer.once(CANCEL_BUILD_TILE_LAYER_COMPLETED(configuration.id), () => {
        resolve()
      })
      ipcRenderer.send(CANCEL_BUILD_TILE_LAYER, { configuration: configuration })
    })
  },
  cancelTileRequest: (id) => {
    try {
      ipcRenderer.send(CANCEL_TILE_REQUEST, { id: id })
    } catch (e) {
      console.error(e)
    }
  },
  requestTile: async (request) => {
    return new Promise(resolve => {
      try {
        ipcRenderer.once(REQUEST_TILE_COMPLETED(request.id), (event, result) => {
          resolve(result)
        })
        ipcRenderer.send(REQUEST_TILE, request)
      } catch (e) {
        console.error(e)
      }
    })
  },
  cancelTileCompilationRequest: (id) => {
    ipcRenderer.send(CANCEL_TILE_COMPILATION_REQUEST, { id: id })
    ipcRenderer.removeAllListeners(REQUEST_TILE_COMPILATION_COMPLETED(id))
  },
  requestTileCompilation: async (request) => {
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_TILE_COMPILATION_COMPLETED(request.id), (event, result) => {
        resolve(result)
      })
      ipcRenderer.send(REQUEST_TILE_COMPILATION, request)
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
      await jetpack.copyAsync(oldPath, newPath, { overwrite: true })

      if (configuration.type === 'tile') {
        // create new geopackage and copy tile table
        const layer = constructLayer({
          id: baseMapId,
          directory: baseMapDirectory,
          sourceDirectory: baseMapDirectory,
          filePath: newPath,
          sourceLayerName: configuration.tableName,
          layerType: 'GeoPackage'
        })
        layerConfiguration = layer.configuration
        extent = await getGeoPackageExtent(newPath, configuration.tableName)
      } else {
        // create new geopackage and copy feature table
        const layer = constructLayer({
          id: baseMapId,
          directory: baseMapDirectory,
          sourceDirectory: baseMapDirectory,
          geopackageFilePath: newPath,
          sourceLayerName: configuration.tableName,
          sourceType: 'GeoPackage',
          layerType: 'Vector',
          maxFeatures: configuration.maxFeatures
        })
        layerConfiguration = layer.configuration
        extent = await getBoundingBoxForTable(newPath, configuration.tableName)
      }
    } else {
      // handle data source
      layerConfiguration = cloneDeep(configuration)
      layerConfiguration.id = baseMapId
      extent = layerConfiguration.extent || [-180, -90, 180, 90]
      await jetpack.copyAsync(layerConfiguration.directory, baseMapDirectory, { overwrite: true })
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
  openExternal: (link) => {
    ipcRenderer.send(OPEN_EXTERNAL, link)
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
  isRasterMissing: (layerType, rasterFile) => {
    return layerType === GEOTIFF && (rasterFile == null || !jetpack.exists(rasterFile))
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
  downloadBase64Image: async (filePath, base64Image) => {
    return new Promise(resolve => {
      fs.writeFile(filePath, base64Image, { encoding: 'base64' }, resolve)
    })
  },
  copyFile: async (filePath, toFilePath) => {
    return new Promise(resolve => {
      fs.copyFile(filePath, toFilePath, resolve)
    })
  },
  launchUserGuide: () => {
    ipcRenderer.send(LAUNCH_USER_GUIDE)
  },
  getGeoPackageEditableColumnsForFeature,
  getFeatureViewData,
  saveGeoPackageEditedFeature,
  showFeatureTableWindow: (forcePopupWindowToFront = false) => {
    ipcRenderer.send(SHOW_FEATURE_TABLE_WINDOW, { force: forcePopupWindowToFront })
  },
  hideFeatureTableWindow: () => {
    ipcRenderer.send(HIDE_FEATURE_TABLE_WINDOW)
  },
  sendFeatureTableEvent: (event) => {
    ipcRenderer.send(FEATURE_TABLE_EVENT, event)
  },
  registerFeatureTableActionListener: (listener) => {
    ipcRenderer.on(FEATURE_TABLE_ACTION, listener)
  },
  registerHideFeatureTableWindowListener: (listener) => {
    ipcRenderer.on(HIDE_FEATURE_TABLE_WINDOW, listener)
  },
  unregisterFeatureTableActionListener: () => {
    ipcRenderer.removeAllListeners(FEATURE_TABLE_ACTION)
  },
  unregisterHideFeatureTableWindowListener: () => {
    ipcRenderer.removeAllListeners(HIDE_FEATURE_TABLE_WINDOW)
  },
  encryptPassword: CredentialsManagement.encrypt,
  getDefaultIcon,
  reprojectBoundingBox,
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
  sendWindowToFront: () => {
    ipcRenderer.send(SEND_WINDOW_TO_FRONT)
  },
  convertPbfToDataUrl,
  getBoundingBoxForTable,
  getTables,
  getGeoPackageFileSize,
  getDetails,
  isHealthy,
  normalizeLongitude,
  getExtentOfGeoPackageTables,
  checkGeoPackageHealth,
  exceedsFileSizeLimit,
  getMaxFileSizeString,
  getStyleItemsForFeature,
  fixXYZTileServerUrlForLeaflet,
  getBaseURL,
  supportedImageFormats,
  createUniqueID,
  tileIntersectsXYZ,
  getWebMercatorBoundingBoxFromXYZ,
  getBaseUrlAndQueryParams,
  isXYZ,
  isWFS,
  isWMS,
  isWMTS,
  isArcGISFeatureService,
  isUrlValid,
  requiresSubdomains,
  featureExists,
  getFeatureCountInBoundingBox,
  getFeatureColumns,
  indexFeatureTable,
  deleteMediaAttachment,
  getMediaRelationships,
  hasStyleExtension,
  getGeoPackageFeatureTableStyleData,
  getBoundingBoxForFeature,
  getMediaObjectUrl,
  getStyleDrawOverlap,
  getLayerColumns,
  getEditableColumnObject,
  getFeatureCount,
  getFeatureTablePage,
  getMetersPerUnit,
  getUnits,
  convertToWebMercator,
  getIconImageData,
  getClosestFeature,
  getFeatureImageObjectUrl,
  getFeatureStyleOrIcon,
  downloadAttachment,
  registerUndoListener: (listener) => {
    ipcRenderer.on(UNDO, listener)
  },
  registerRedoListener: (listener) => {
    ipcRenderer.on(REDO, listener)
  },
  unregisterUndoListeners: () => {
    ipcRenderer.removeAllListeners(UNDO)
  },
  unregisterRedoListeners: () => {
    ipcRenderer.removeAllListeners(REDO)
  },
  renameGeoPackageTable: (filePath, tableName, newTableName) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_RENAME_COMPLETED(requestId), (event, result) => {
        resolve(!!result)
      })
      ipcRenderer.send(REQUEST_GEOPACKAGE_TABLE_RENAME, { id: requestId, filePath, tableName: tableName, newTableName })
    })
  },
  deleteGeoPackageTable: (filePath, tableName) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_DELETE_COMPLETED(requestId), (event, result) => {
        resolve(!!result)
      })
      ipcRenderer.send(REQUEST_GEOPACKAGE_TABLE_DELETE, { id: requestId, filePath, tableName })
    })
  },
  copyGeoPackageTable: (filePath, tableName, copyTableName) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_COPY_COMPLETED(requestId), (event, result) => {
        resolve(!!result.result)
      })
      ipcRenderer.send(REQUEST_GEOPACKAGE_TABLE_COPY, { id: requestId, filePath, tableName, copyTableName })
    })
  },
  countGeoPackageTable: (filePath, tableName, search) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_COUNT_COMPLETED(requestId), (event, { result }) => {
        resolve(result)
      })
      ipcRenderer.send(REQUEST_GEOPACKAGE_TABLE_COUNT, { id: requestId, filePath, tableName, search })
    })
  },
  searchGeoPackageTable: (filePath, tableName, page, pageSize, sortBy, desc, search) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_SEARCH_COMPLETED(requestId), (event, { result }) => {
        resolve(result)
      })
      ipcRenderer.send(REQUEST_GEOPACKAGE_TABLE_SEARCH, {
        id: requestId,
        filePath,
        tableName,
        page,
        pageSize,
        sortBy,
        desc,
        search
      })
    })
  },
  deleteProjectFolder,
  getGeoPackageFeatureTableForApp,
  getOrCreateGeoPackageForApp,
  renameGeoPackage,
  renameGeoPackageFeatureTableColumn,
  renameDataSourceFeatureTableColumn,
  deleteGeoPackageFeatureTableColumn,
  deleteDataSourceFeatureTableColumn,
  addGeoPackageFeatureTableColumn,
  addDataSourceFeatureTableColumn,
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
  removeStyleExtensionForTable,
  addStyleExtensionForTable,
  getLastModifiedDate,
  addFeatureTableToGeoPackage,
  addFeatureToGeoPackage,
  updateFeatureTable,
  removeFeatureFromGeoPackage,
  removeFeatureFromDataSource,
  deleteFeatureIdsFromGeoPackage,
  deleteFeatureIdsFromDataSource,
  synchronizeGeoPackage,
  synchronizeDataSource,
  clearStylingForFeature,
})
