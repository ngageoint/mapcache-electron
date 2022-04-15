import path from 'path'
import fs from 'fs'
import jetpack from 'fs-jetpack'
import log from 'electron-log'
import isNil from 'lodash/isNil'
import cloneDeep from 'lodash/cloneDeep'
import CredentialsManagement from '../network/CredentialsManagement'
import Store from 'electron-store'
import { clipboard, contextBridge, ipcRenderer, shell } from 'electron'
import {
  Context,
  GeometryType,
  HtmlCanvasAdapter,
  SqliteAdapter,
  GeoPackageDataType,
} from '@ngageoint/geopackage'
import { exceedsFileSizeLimit, getMaxFileSizeString } from '../util/media/MediaUtilities'
import {
  createNextAvailableBaseMapDirectory,
  createNextAvailableSourceDirectory,
  getExtraResourcesDirectory,
  exists,
  rmDirAsync
} from '../util/file/FileUtilities'
import { getDefaultIcon } from '../util/style/NodeStyleUtilities'
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
  removeStyleExtensionForTable,
  addFeatureTableToGeoPackage,
  updateFeatureGeometry,
  addFeatureToGeoPackage,
  updateFeatureTable,
  removeFeatureFromGeopackage,
  removeFeatureFromDataSource,
  deleteFeatureIdsFromGeoPackage,
  deleteFeatureIdsFromDataSource,
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
  updateRenamedGeoPackageTable,
  updateDeletedGeoPackageTileTable,
  addCopiedGeoPackageTileTable,
  addStyleExtensionForTable,
  popOutFeatureTable,
  updateGeoPackageFeatureTableColumnOrder,
  updateDataSourceColumnOrder, allowNotifications
} from '../vue/vuex/ProjectActions'
import { deleteProject, setDataSourceVisible } from '../vue/vuex/CommonActions'
import { getOrCreateGeoPackage, getGeoPackageExtent, getBoundingBoxForTable, getTables, getGeoPackageFileSize, getDetails, isHealthy, normalizeLongitude, getExtentOfGeoPackageTables, checkGeoPackageHealth } from '../geopackage/GeoPackageCommon'
import { getFeaturesForTablesAtLatLngZoom } from '../geopackage/GeoPackageMapUtilities'
import {
  getFeatureRow,
  featureExists,
  countOfFeaturesAt,
  getFeatureCountInBoundingBox,
  getFeatureColumns,
  indexFeatureTable,
  getAllFeaturesAsGeoJSON,
  getBoundingBoxForFeature,
  getLayerColumns,
  getFeatureCount,
  getFeatureTablePage,
  getFeatureTablePageAtLatLngZoom,
  getGeoPackageEditableColumnsForFeature,
  saveGeoPackageEditedFeature,
  getEditableColumnObject,
  getClosestFeature,
  getFeatureViewData,
  checkUnique, getForms,
} from '../geopackage/GeoPackageFeatureTableUtilities'
import {
  getMediaAttachmentsCounts,
  deleteMediaAttachment,
  getMediaRelationships,
  getMediaObjectUrl,
  getFeatureImageObjectUrl,
  getAllAttachments,
  getImageAttachments,
  getVideoAttachments,
} from '../geopackage/GeoPackageMediaUtilities'
import {
  getStyleItemsForFeature,
  getStyleAssignmentForFeatures,
  getStyleDrawOverlap,
  hasStyleExtension,
  getGeoPackageFeatureTableStyleData,
  getIconImageData,
  getFeatureStyleOrIcon
} from '../geopackage/GeoPackageStyleUtilities'
import { createUniqueID } from '../util/UniqueIDUtilities'
import {
  getBaseUrlAndQueryParams,
  isXYZ,
  isWFS,
  isWMS,
  isArcGISFeatureService,
  isUrlValid,
  requiresSubdomains,
  isWMTS
} from '../network/URLUtilities'
import { constructLayer } from '../layer/LayerFactory'
import { fixXYZTileServerUrlForLeaflet } from '../util/xyz/XYZTileUtilities'
import { getBaseURL, supportedImageFormats } from '../util/geoserver/GeoServiceUtilities'
import { getWebMercatorBoundingBoxFromXYZ, tileIntersectsXYZ } from '../util/tile/TileBoundingBoxUtils'
import {
  getDef,
  reprojectWebMercatorBoundingBox,
  getMetersPerUnit,
  getUnits,
  convertToWebMercator
} from '../projection/ProjectionUtilities'
import { GEOTIFF } from '../layer/LayerTypes'
import {
  ATTACH_MEDIA,
  ATTACH_MEDIA_COMPLETED,
  BUILD_FEATURE_LAYER,
  BUILD_FEATURE_LAYER_COMPLETED,
  BUILD_FEATURE_LAYER_STATUS,
  BUILD_TILE_LAYER,
  BUILD_TILE_LAYER_COMPLETED,
  BUILD_TILE_LAYER_STATUS,
  CANCEL_BUILD_FEATURE_LAYER,
  CANCEL_BUILD_FEATURE_LAYER_COMPLETED,
  CANCEL_BUILD_TILE_LAYER,
  CANCEL_BUILD_TILE_LAYER_COMPLETED,
  CANCEL_PROCESS_SOURCE,
  CANCEL_PROCESS_SOURCE_COMPLETED,
  CANCEL_REPROJECT_TILE_REQUEST,
  CANCEL_SERVICE_REQUEST,
  CANCEL_TILE_REQUEST,
  CLIENT_CERTIFICATE_SELECTED,
  CLIENT_CREDENTIALS_INPUT,
  CLOSE_PROJECT,
  CLOSING_PROJECT_WINDOW,
  FEATURE_TABLE_ACTION,
  FEATURE_TABLE_EVENT,
  GENERATE_GEOTIFF_RASTER_FILE,
  GENERATE_GEOTIFF_RASTER_FILE_COMPLETED,
  GET_APP_DATA_DIRECTORY,
  GET_USER_DATA_DIRECTORY,
  HIDE_FEATURE_TABLE_WINDOW,
  IPC_EVENT_CONNECT,
  IPC_EVENT_NOTIFY_MAIN,
  IPC_EVENT_NOTIFY_RENDERERS,
  LOAD_OR_DISPLAY_GEOPACKAGES,
  OPEN_EXTERNAL,
  PROCESS_SOURCE,
  PROCESS_SOURCE_COMPLETED,
  PROCESS_SOURCE_STATUS,
  REQUEST_CLIENT_CREDENTIALS,
  REQUEST_GEOPACKAGE_TABLE_COPY,
  REQUEST_GEOPACKAGE_TABLE_COPY_COMPLETED,
  REQUEST_GEOPACKAGE_TABLE_COUNT,
  REQUEST_GEOPACKAGE_TABLE_COUNT_COMPLETED,
  REQUEST_GEOPACKAGE_TABLE_SEARCH,
  REQUEST_GEOPACKAGE_TABLE_SEARCH_COMPLETED,
  REQUEST_GEOPACKAGE_TABLE_DELETE,
  REQUEST_GEOPACKAGE_TABLE_DELETE_COMPLETED,
  REQUEST_GEOPACKAGE_TABLE_RENAME,
  REQUEST_GEOPACKAGE_TABLE_RENAME_COMPLETED,
  REQUEST_REPROJECT_TILE,
  REQUEST_REPROJECT_TILE_COMPLETED,
  REQUEST_TILE,
  REQUEST_TILE_COMPLETED,
  SELECT_CLIENT_CERTIFICATE,
  SHOW_FEATURE_TABLE_WINDOW,
  LAUNCH_USER_GUIDE,
  SEND_WINDOW_TO_FRONT,
  UNDO,
  REDO,
} from '../electron/ipc/MapCacheIPC'
import { getOverpassQuery } from '../util/overpass/OverpassUtilities'
import {
  convertPbfToDataUrl,
  drawVectorFeaturesInCanvas,
  getVectorTileFeatures
} from '../util/rendering/MBTilesUtilities'
import {showOpenDialog, showSaveDialog} from '../electron/dialog/DialogUtilities'

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

log.transports.file.resolvePath = () => path.join(getUserDataDirectory(), 'logs', 'mapcache.log')
Object.assign(console, log.functions)
contextBridge.exposeInMainWorld('log', log.functions)

// if a user cancels inputting credentials, we will need to force a cancel of the the request
const cancelRequestURLToCallbackMap = {}
ipcRenderer.on(CANCEL_SERVICE_REQUEST, (event, url) => {
  if (cancelRequestURLToCallbackMap[url]) {
    cancelRequestURLToCallbackMap[url]()
  }
})

let fileStreams = {}

let storage

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
  openFileStream: (path) => {
    const id = createUniqueID()
    fileStreams[id] = fs.createWriteStream(path, {flags: 'a'})
    return id
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
    return path.join(getExtraResourcesDirectory(), 'offline.gpkg')
  },
  getProjectionDefinition: (code) => {
    return getDef(code)
  },
  createBaseMapDirectory,
  createSourceDirectory: (projectDirectory) => {
    return createNextAvailableSourceDirectory(projectDirectory)
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
  },
  closeProject: () => {
    ipcRenderer.send(CLOSE_PROJECT)
  },
  cancelProcessingSource: (source) => {
    return new Promise(resolve => {
      ipcRenderer.removeAllListeners(PROCESS_SOURCE_COMPLETED(source.id))
      ipcRenderer.once(CANCEL_PROCESS_SOURCE_COMPLETED(source.id), resolve)
      ipcRenderer.send(CANCEL_PROCESS_SOURCE, source)
    })
  },
  attachMediaToGeoPackage: (data) => {
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
  onceProcessSourceCompleted: (id) => {
    return new Promise(resolve => {
      ipcRenderer.once(PROCESS_SOURCE_COMPLETED(id), (event, result) => {
        resolve(result)
      })
    })
  },
  addFeatureLayer: (configuration, statusCallback) => {
    return new Promise(resolve => {
      ipcRenderer.once(BUILD_FEATURE_LAYER_COMPLETED(configuration.id), () => {
        ipcRenderer.removeAllListeners(BUILD_FEATURE_LAYER_STATUS(configuration.id))
        resolve()
      })
      ipcRenderer.on(BUILD_FEATURE_LAYER_STATUS(configuration.id), (event, status) => {
        statusCallback(status)
      })
      ipcRenderer.send(BUILD_FEATURE_LAYER, {configuration: configuration})
    })
  },
  cancelAddFeatureLayer: (configuration) => {
    return new Promise(resolve => {
      ipcRenderer.removeAllListeners(BUILD_FEATURE_LAYER_STATUS(configuration.id))
      ipcRenderer.removeAllListeners(BUILD_FEATURE_LAYER_COMPLETED(configuration.id))
      ipcRenderer.once(CANCEL_BUILD_FEATURE_LAYER_COMPLETED(configuration.id), () => {
        resolve()
      })
      ipcRenderer.send(CANCEL_BUILD_FEATURE_LAYER, {configuration: configuration})
    })
  },
  addTileLayer: (configuration, statusCallback) => {
    return new Promise(resolve => {
      ipcRenderer.once(BUILD_TILE_LAYER_COMPLETED(configuration.id), () => {
        ipcRenderer.removeAllListeners(BUILD_TILE_LAYER_STATUS(configuration.id))
        resolve()
      })
      ipcRenderer.on(BUILD_TILE_LAYER_STATUS(configuration.id), (event, status) => {
        statusCallback(status)
      })
      ipcRenderer.send(BUILD_TILE_LAYER, {configuration: configuration})
    })
  },
  cancelAddTileLayer: (configuration) => {
    return new Promise(resolve => {
      ipcRenderer.removeAllListeners(BUILD_TILE_LAYER_STATUS(configuration.id))
      ipcRenderer.removeAllListeners(BUILD_TILE_LAYER_COMPLETED(configuration.id))
      ipcRenderer.once(CANCEL_BUILD_TILE_LAYER_COMPLETED(configuration.id), () => {
        resolve()
      })
      ipcRenderer.send(CANCEL_BUILD_TILE_LAYER, {configuration: configuration})
    })
  },
  cancelTileRequest: (id) => {
    ipcRenderer.send(CANCEL_TILE_REQUEST, {id: id})
  },
  requestTile: (request) => {
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_TILE_COMPLETED(request.id), (event, result) => {
        resolve(result)
      })
      ipcRenderer.send(REQUEST_TILE, request)
    })
  },
  cancelTileReprojectionRequest: (id) => {
    ipcRenderer.send(CANCEL_REPROJECT_TILE_REQUEST, {id: id})
    ipcRenderer.removeAllListeners(REQUEST_REPROJECT_TILE_COMPLETED(id))
  },
  requestTileReprojection: (request) => {
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_REPROJECT_TILE_COMPLETED(request.id), (event, result) => {
        resolve(result)
      })
      ipcRenderer.send(REQUEST_REPROJECT_TILE, request)
    })
  },
  renameGeoPackageTable: ({projectId, geopackageId, filePath, tableName, newTableName, type = 'feature'}) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_RENAME_COMPLETED(requestId), (event, result) => {
        if (result) {
          updateRenamedGeoPackageTable({projectId, geopackageId, tableName, newTableName, type})
        }
        resolve(result)
      })
      ipcRenderer.send(REQUEST_GEOPACKAGE_TABLE_RENAME, {id: requestId, filePath, tableName: tableName, newTableName})
    })
  },
  deleteGeoPackageTable: ({projectId, geopackageId, filePath, tableName, type = 'feature', silent = false}) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_DELETE_COMPLETED(requestId), (event, result) => {
        if (result && !silent) {
          updateDeletedGeoPackageTileTable({projectId, geopackageId, tableName, type})
        }
        resolve(result)
      })
      ipcRenderer.send(REQUEST_GEOPACKAGE_TABLE_DELETE, {id: requestId, filePath, tableName})
    })
  },
  copyGeoPackageTable: ({projectId, geopackageId, filePath, tableName, copyTableName, type = 'feature'}) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_COPY_COMPLETED(requestId), (event, result) => {
        if (result.result) {
          addCopiedGeoPackageTileTable({projectId, geopackageId, tableName, copyTableName, type})
        }
        resolve(result)
      })
      ipcRenderer.send(REQUEST_GEOPACKAGE_TABLE_COPY, {id: requestId, filePath, tableName, copyTableName})
    })
  },
  countGeoPackageTable: ({filePath, tableName, search}) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_COUNT_COMPLETED(requestId), (event, {result}) => {
        resolve(result)
      })
      ipcRenderer.send(REQUEST_GEOPACKAGE_TABLE_COUNT, {id: requestId, filePath, tableName, search})
    })
  },
  searchGeoPackageTable: ({filePath, tableName, page, pageSize, sortBy, desc, search}) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_SEARCH_COMPLETED(requestId), (event, {result}) => {
        resolve(result)
      })
      ipcRenderer.send(REQUEST_GEOPACKAGE_TABLE_SEARCH, {id: requestId, filePath, tableName, page, pageSize, sortBy, desc, search})
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
  downloadBase64Image: (filePath, base64Image) => {
    return new Promise(resolve => {
      fs.writeFile(filePath, base64Image, {encoding: 'base64'}, resolve)
    })
  },
  copyFile: (filePath, toFilePath) => {
    return new Promise(resolve => {
      fs.copyFile(filePath, toFilePath, resolve)
    })
  },
  launchUserGuide: () => {
    ipcRenderer.send(LAUNCH_USER_GUIDE)
  },
  getGeoPackageEditableColumnsForFeature,
  updateGeoPackageFeatureTableColumnOrder,
  updateDataSourceColumnOrder,
  getFeatureViewData,
  checkUnique,
  saveGeoPackageEditedFeature,
  showFeatureTableWindow: (forcePopupWindowToFront = false) => {
    ipcRenderer.send(SHOW_FEATURE_TABLE_WINDOW, {force: forcePopupWindowToFront})
  },
  hideFeatureTableWindow: () => {
    ipcRenderer.send(HIDE_FEATURE_TABLE_WINDOW)
  },
  registerHideFeatureTableWindowListener: (listener) => {
    ipcRenderer.on(HIDE_FEATURE_TABLE_WINDOW, listener)
  },
  sendFeatureTableEvent: (event) => {
    ipcRenderer.send(FEATURE_TABLE_EVENT, event)
  },
  registerFeatureTableActionListener: (listener) => {
    ipcRenderer.on(FEATURE_TABLE_ACTION, listener)
  },
  encryptPassword: CredentialsManagement.encrypt,
  getDefaultIcon,
  reprojectWebMercatorBoundingBox,
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
  getOrCreateGeoPackage,
  getGeoPackageExtent,
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
  isWMTS,
  isArcGISFeatureService,
  isUrlValid,
  requiresSubdomains,
  getFeaturesForTablesAtLatLngZoom,
  getFeatureRow,
  featureExists,
  countOfFeaturesAt,
  getFeatureCountInBoundingBox,
  getFeatureColumns,
  getForms,
  indexFeatureTable,
  getAllFeaturesAsGeoJSON,
  getMediaAttachmentsCounts,
  deleteMediaAttachment,
  getMediaRelationships,
  setDataSource,
  setProjectName,
  showToolTips,
  allowNotifications,
  setDataSourceDisplayName,
  addDataSources,
  addGeoPackage,
  setGeoPackageLayersVisible,
  setGeoPackageFeatureTableVisible,
  setGeoPackageTileTableVisible,
  sleep,
  renameGeoPackage,
  removeGeoPackage,
  renameGeoPackageFeatureTableColumn,
  deleteGeoPackageFeatureTableColumn,
  addGeoPackageFeatureTableColumn,
  removeDataSource,
  getGeoPackageFilePath,
  setFeatureStyle,
  clearStylingForFeature,
  setFeatureIcon,
  setTableStyle,
  setTableIcon,
  createStyleRow,
  createIconRow,
  updateStyleRow,
  updateIconRow,
  deleteStyleRow,
  deleteIconRow,
  hasStyleExtension,
  getGeoPackageFeatureTableStyleData,
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
  getBoundingBoxForFeature,
  getMediaObjectUrl,
  getStyleDrawOverlap,
  getOverpassQuery,
  getLayerColumns,
  getEditableColumnObject,
  getFeatureCount,
  getFeatureTablePage,
  getFeatureTablePageAtLatLngZoom,
  createGeoPackageWithFeatureTable,
  getMetersPerUnit,
  getUnits,
  getDef,
  drawVectorFeaturesInCanvas,
  getVectorTileFeatures,
  convertToWebMercator,
  getIconImageData,
  addStyleExtensionForTable,
  getClosestFeature,
  getFeatureImageObjectUrl,
  getImageAttachments,
  getVideoAttachments,
  getAllAttachments,
  deleteFeatureIdsFromGeoPackage,
  deleteFeatureIdsFromDataSource,
  getFeatureStyleOrIcon,
  popOutFeatureTable,
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
  }
})
