import log from 'electron-log'
import Store from 'electron-store'
import path from 'path'
import { ipcRenderer, contextBridge } from 'electron'
import {SqliteAdapter, HtmlCanvasAdapter, Context, GeometryType, GeoPackageDataType} from '@ngageoint/geopackage'
import { createUniqueID } from '../util/UniqueIDUtilities'
import {
  getEditableColumnObject,
  getFeatureColumns,
  getFeatureTablePage,
  getFeatureTablePageAtLatLngZoom,
  getGeoPackageEditableColumnsForFeature,
  getLayerColumns,
  saveGeoPackageEditedFeature
} from '../geopackage/GeoPackageFeatureTableUtilities'
import {
  deleteMediaAttachment,
  downloadAttachment,
  getMediaObjectUrl,
  getMediaRelationships,
} from '../geopackage/GeoPackageMediaUtilities'
import {
  addStyleExtensionForTable,
  clearStylingForFeature,
  createIconRow,
  createStyleRow,
  deleteIconRow,
  deleteStyleRow,
  editFeatureGeometry,
  removeFeatureFromDataSource,
  removeFeatureFromGeopackage,
  removeStyleExtensionForTable,
  setFeatureIcon,
  setFeatureStyle,
  setTableIcon,
  setTableStyle,
  synchronizeGeoPackage,
  updateIconRow,
  updateStyleKey,
  updateStyleRow
} from '../vue/vuex/ProjectActions'
import {
  getGeoPackageFeatureTableStyleData,
  getIconImageData,
  getStyleItemsForFeature
} from '../geopackage/GeoPackageStyleUtilities'
import {
  ATTACH_MEDIA,
  ATTACH_MEDIA_COMPLETED,
  FEATURE_TABLE_ACTION,
  FEATURE_TABLE_EVENT,
  GET_USER_DATA_DIRECTORY,
  HIDE_FEATURE_TABLE_WINDOW,
  IPC_EVENT_CONNECT,
  IPC_EVENT_NOTIFY_MAIN,
  IPC_EVENT_NOTIFY_RENDERERS
} from '../electron/ipc/MapCacheIPC'
import { getFeaturesForTablesAtLatLngZoom } from '../geopackage/GeoPackageMapUtilities'
import {exceedsFileSizeLimit, getMaxFileSizeString} from '../util/media/MediaUtilities'
import { getDefaultIcon } from '../util/style/NodeStyleUtilities'
import { showOpenDialog, showSaveDialog } from '../electron/dialog/DialogUtilities'
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
    return ipcRenderer.sendSync(GET_USER_DATA_DIRECTORY)
  },
  hideFeatureTableWindow: (popIn = false) => {
    ipcRenderer.send(HIDE_FEATURE_TABLE_WINDOW, {popIn: popIn})
  },
  registerFeatureTableEventListener: (listener) => {
    ipcRenderer.on(FEATURE_TABLE_EVENT, listener)
  },
  sendFeatureTableAction: (action) => {
    ipcRenderer.send(FEATURE_TABLE_ACTION, action)
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
  // functions needed for feature table
  getFeatureColumns,
  removeFeatureFromGeopackage,
  removeFeatureFromDataSource,
  getStyleItemsForFeature,
  editFeatureGeometry,
  getFeatureTablePage,
  getFeaturesForTablesAtLatLngZoom,
  getFeatureTablePageAtLatLngZoom,
  // functions needed for style editor
  deleteIconRow,
  updateIconRow,
  createIconRow,
  deleteStyleRow,
  updateStyleRow,
  createStyleRow,
  setFeatureIcon,
  setFeatureStyle,
  clearStylingForFeature,
  setTableStyle,
  setTableIcon,
  getDefaultIcon,
  getGeoPackageFeatureTableStyleData,
  addStyleExtensionForTable,
  removeStyleExtensionForTable,
  // functions needed for feature editor
  getGeoPackageEditableColumnsForFeature,
  getLayerColumns,
  saveGeoPackageEditedFeature,
  synchronizeGeoPackage,
  getEditableColumnObject,
  // functions needed for media attachments
  getMediaObjectUrl,
  deleteMediaAttachment,
  updateStyleKey,
  showOpenDialog,
  showSaveDialog,
  downloadAttachment,
  exceedsFileSizeLimit,
  getMediaRelationships,
  getMaxFileSizeString,
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
  getIconImageData
})
