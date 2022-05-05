import log from 'electron-log'
import Store from 'electron-store'
import path from 'path'
import { ipcRenderer, contextBridge } from 'electron'
import {SqliteAdapter, HtmlCanvasAdapter, Context, GeometryType, GeoPackageDataType} from '@ngageoint/geopackage'
import { createUniqueID } from '../util/UniqueIDUtilities'
import {
  getFeatureColumns,
  getFeatureCount,
  getFeatureTablePage
} from '../geopackage/GeoPackageFeatureTableUtilities'
import {
  deleteFeatureIdsFromDataSource,
  deleteFeatureIdsFromGeoPackage,
  popOutFeatureTable,
  updateDataSourceColumnOrder,
  updateGeoPackageFeatureTableColumnOrder
} from '../vue/vuex/ProjectActions'
import {
  FEATURE_TABLE_ACTION,
  FEATURE_TABLE_EVENT,
  GET_USER_DATA_DIRECTORY,
  HIDE_FEATURE_TABLE_WINDOW,
  IPC_EVENT_CONNECT,
  IPC_EVENT_NOTIFY_MAIN,
  IPC_EVENT_NOTIFY_RENDERERS,
  REQUEST_GEOPACKAGE_TABLE_COUNT,
  REQUEST_GEOPACKAGE_TABLE_COUNT_COMPLETED,
  REQUEST_GEOPACKAGE_TABLE_SEARCH,
  REQUEST_GEOPACKAGE_TABLE_SEARCH_COMPLETED
} from '../electron/ipc/MapCacheIPC'

const getUserDataDirectory = () => {
  return ipcRenderer.sendSync(GET_USER_DATA_DIRECTORY)
}

log.transports.file.resolvePath = () => path.join(getUserDataDirectory(), 'logs', 'mapcache.log')
Object.assign(console, log.functions)
contextBridge.exposeInMainWorld('log', log.functions)

let storage

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
  setupGeoPackageContext: () => {
    Context.setupCustomContext(SqliteAdapter, HtmlCanvasAdapter)
  },
  getUserDataDirectory,
  getAppDataDirectory: () => {
    return ipcRenderer.sendSync(GET_USER_DATA_DIRECTORY)
  },
  hideFeatureTableWindow: () => {
    ipcRenderer.send(HIDE_FEATURE_TABLE_WINDOW)
  },
  registerFeatureTableEventListener: (listener) => {
    ipcRenderer.on(FEATURE_TABLE_EVENT, listener)
  },
  sendFeatureTableAction: (action) => {
    ipcRenderer.send(FEATURE_TABLE_ACTION, action)
  },
  countGeoPackageTable: ({filePath, tableName, search}) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_COUNT_COMPLETED(requestId), (event, result) => {
        resolve(result.result)
      })
      ipcRenderer.send(REQUEST_GEOPACKAGE_TABLE_COUNT, {id: requestId, filePath, tableName, search})
    })
  },
  searchGeoPackageTable: ({filePath, tableName, page, pageSize, sortBy, desc, search}) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_SEARCH_COMPLETED(requestId), (event, result) => {
        resolve(result.result)
      })
      ipcRenderer.send(REQUEST_GEOPACKAGE_TABLE_SEARCH, {id: requestId, filePath, tableName, page, pageSize, sortBy, desc, search})
    })
  },
  updateGeoPackageFeatureTableColumnOrder,
  createUniqueID,
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
  // functions needed for feature table
  getFeatureColumns,
  getFeatureTablePage,
  updateDataSourceColumnOrder,
  // functions needed for media attachments
  deleteFeatureIdsFromGeoPackage,
  deleteFeatureIdsFromDataSource,
  getFeatureCount,
  popOutFeatureTable
})
