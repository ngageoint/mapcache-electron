import log from 'electron-log/renderer'
import { ipcRenderer, contextBridge } from 'electron'
import { SqliteAdapter, HtmlCanvasAdapter, Context, GeometryType, GeoPackageDataType } from '@ngageoint/geopackage'
import { createUniqueID } from '../../lib/util/UniqueIDUtilities'
import { getFeatureColumns, getFeatureCount, getFeatureTablePage } from '../../lib/geopackage/GeoPackageFeatureTableUtilities'
import {
  FEATURE_TABLE_ACTION,
  FEATURE_TABLE_EVENT, GET_APP_VERSION,
  GET_USER_DATA_DIRECTORY,
  HIDE_FEATURE_TABLE_WINDOW,
  REQUEST_GEOPACKAGE_TABLE_COUNT,
  REQUEST_GEOPACKAGE_TABLE_COUNT_COMPLETED,
  REQUEST_GEOPACKAGE_TABLE_SEARCH,
  REQUEST_GEOPACKAGE_TABLE_SEARCH_COMPLETED
} from '../lib/ipc/MapCacheIPC'
import { vuexElectronAPI } from './vuexPreload'
import { deleteFeatureIdsFromDataSource, deleteFeatureIdsFromGeoPackage } from '../../lib/vue/vuex/ProjectPreloadFunctions'
import { getGeoPackageFeatureTableForApp } from '../../lib/geopackage/GeoPackageCommon'

const getUserDataDirectory = () => {
  return ipcRenderer.sendSync(GET_USER_DATA_DIRECTORY)
}

Object.assign(console, log.functions)
contextBridge.exposeInMainWorld('log', log.functions)
contextBridge.exposeInMainWorld('vuex', vuexElectronAPI)
contextBridge.exposeInMainWorld('mapcache', {
  setupGeoPackageContext: () => {
    Context.setupCustomContext(SqliteAdapter, HtmlCanvasAdapter)
  },
  getUserDataDirectory,
  getAppDataDirectory: () => {
    return ipcRenderer.sendSync(GET_USER_DATA_DIRECTORY)
  },
  getAppVersion: () => {
    return ipcRenderer.sendSync(GET_APP_VERSION)
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
  countGeoPackageTable: async (filePath, tableName, search) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_COUNT_COMPLETED(requestId), (event, result) => {
        resolve(result.result)
      })
      ipcRenderer.send(REQUEST_GEOPACKAGE_TABLE_COUNT, { id: requestId, filePath, tableName, search })
    })
  },
  searchGeoPackageTable: async (filePath, tableName, page, pageSize, sortBy, desc, search) => {
    const requestId = createUniqueID()
    return new Promise(resolve => {
      ipcRenderer.once(REQUEST_GEOPACKAGE_TABLE_SEARCH_COMPLETED(requestId), (event, result) => {
        resolve(result.result)
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
  getFeatureColumns,
  getFeatureTablePage,
  getFeatureCount,
  deleteFeatureIdsFromGeoPackage,
  deleteFeatureIdsFromDataSource,
  getGeoPackageFeatureTableForApp,
})