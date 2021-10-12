const GET_APP_VERSION = 'get-app-version'
const GET_USER_DATA_DIRECTORY = 'get-user-data-directory'
const GET_APP_DATA_DIRECTORY = 'get-app-data-directory'
const OPEN_EXTERNAL = 'open-external'
const SHOW_SAVE_DIALOG = 'show-save-dialog'
const SHOW_SAVE_DIALOG_COMPLETED = 'show-save-dialog-completed'
const SHOW_OPEN_DIALOG = 'show-open-dialog'
const SHOW_OPEN_DIALOG_COMPLETED = 'show-open-dialog-completed'
const SHOW_PROJECT = 'show-project'
const CLOSE_PROJECT = 'close-project'
const CLOSING_PROJECT_WINDOW = 'closing-project-window'
const PROCESS_SOURCE = 'process-source'
function PROCESS_SOURCE_COMPLETED (id) {
  return 'process-source-completed-' + id
}
const CANCEL_PROCESS_SOURCE = 'cancel-process-source'
function CANCEL_PROCESS_SOURCE_COMPLETED (id) {
  return 'cancel-process-source-completed-' + id
}
const BUILD_FEATURE_LAYER = 'build-feature-layer'
const CANCEL_BUILD_FEATURE_LAYER = 'cancel-build-feature-layer'
const BUILD_TILE_LAYER = 'build-tile-layer'
const CANCEL_BUILD_TILE_LAYER = 'cancel-build-tile-layer'
const QUICK_DOWNLOAD_GEOPACKAGE = 'quick-download-geopackage'
const ATTACH_MEDIA = 'attach-media'
function ATTACH_MEDIA_COMPLETED (id) {
  return 'attach-media-completed-' + id
}
const REQUEST_TILE = 'request-tile'
function REQUEST_TILE_COMPLETED (id) {
  return 'request-tile-completed-' + id
}
const CANCEL_TILE_REQUEST = 'cancel-tile-request'
const GENERATE_GEOTIFF_RASTER_FILE = 'generate-geotiff-raster-file'
function GENERATE_GEOTIFF_RASTER_FILE_COMPLETED (id) {
  return 'generate-geotiff-raster-file-completed-' + id
}
const REQUEST_REPROJECT_TILE = 'request-reproject-tile'
function REQUEST_REPROJECT_TILE_COMPLETED (id) {
  return 'request-reproject-tile-completed-' + id
}
const CANCEL_REPROJECT_TILE_REQUEST = 'cancel-reproject-tile-request'
const WORKER_READY = 'worker-ready'
const CANCEL_SERVICE_REQUEST = 'cancel-service-request'
const WORKER_BUILD_TILE_LAYER = 'worker-build-tile-layer'
function BUILD_TILE_LAYER_COMPLETED (id) {
  return 'build-tile-layer-completed-' + id
}
function BUILD_TILE_LAYER_STATUS (id) {
  return 'build-tile-layer-status-' + id
}
function WORKER_BUILD_TILE_LAYER_COMPLETED (id) {
  return 'worker-build-tile-layer-completed_' + id
}
function WORKER_BUILD_TILE_LAYER_STATUS (id) {
  return 'worker-build-tile-layer-status-' + id
}
function CANCEL_BUILD_TILE_LAYER_COMPLETED (id) {
  return 'cancel-build-tile-layer-completed-' + id
}
const WORKER_BUILD_FEATURE_LAYER = 'worker-build-feature-layer'
function BUILD_FEATURE_LAYER_COMPLETED (id) {
  return 'build-feature-layer-completed-' + id
}
function BUILD_FEATURE_LAYER_STATUS (id) {
  return 'build-feature-layer-status-' + id
}
function WORKER_BUILD_FEATURE_LAYER_COMPLETED (id) {
  return 'worker-build-feature-layer-completed-' + id
}
function WORKER_BUILD_FEATURE_LAYER_STATUS (id) {
  return 'worker-build-feature-layer-status-' + id
}
function CANCEL_BUILD_FEATURE_LAYER_COMPLETED (id) {
  return 'cancel-build-feature-layer-completed-' + id
}
function PROCESS_SOURCE_STATUS (id) {
  return 'process-source-status-' + id
}

const CLIENT_CREDENTIALS_INPUT = 'client-credentials-input'
const CLIENT_CERTIFICATE_SELECTED = 'client-certificate-selected'
const SELECT_CLIENT_CERTIFICATE = 'select-client-certificate'
const REQUEST_CLIENT_CREDENTIALS = 'request-client-credentials'
const IPC_EVENT_CONNECT = 'vuex-mutations-connect'
const IPC_EVENT_NOTIFY_MAIN = 'vuex-mutations-notify-main'
const IPC_EVENT_NOTIFY_RENDERERS = 'vuex-mutations-notify-renderers'

const MAIN_CHANNELS = [
  GET_APP_VERSION,
  GET_USER_DATA_DIRECTORY,
  GET_APP_DATA_DIRECTORY,
  OPEN_EXTERNAL,
  SHOW_SAVE_DIALOG,
  SHOW_OPEN_DIALOG,
  SHOW_PROJECT,
  CLOSE_PROJECT,
  BUILD_FEATURE_LAYER,
  CANCEL_BUILD_FEATURE_LAYER,
  BUILD_TILE_LAYER,
  CANCEL_BUILD_TILE_LAYER,
  QUICK_DOWNLOAD_GEOPACKAGE,
  WORKER_READY
]
const WORKER_CHANNELS = [
  PROCESS_SOURCE,
  CANCEL_PROCESS_SOURCE,
  ATTACH_MEDIA,
  REQUEST_TILE,
  CANCEL_TILE_REQUEST,
  GENERATE_GEOTIFF_RASTER_FILE,
  REQUEST_REPROJECT_TILE,
  CANCEL_REPROJECT_TILE_REQUEST
]

export {
  MAIN_CHANNELS,
  WORKER_CHANNELS,
  CANCEL_SERVICE_REQUEST,
  GET_APP_VERSION,
  GET_USER_DATA_DIRECTORY,
  GET_APP_DATA_DIRECTORY,
  OPEN_EXTERNAL,
  SHOW_SAVE_DIALOG,
  SHOW_SAVE_DIALOG_COMPLETED,
  SHOW_OPEN_DIALOG,
  SHOW_OPEN_DIALOG_COMPLETED,
  SHOW_PROJECT,
  CLOSE_PROJECT,
  CLOSING_PROJECT_WINDOW,
  BUILD_FEATURE_LAYER,
  CANCEL_BUILD_FEATURE_LAYER,
  BUILD_TILE_LAYER,
  CANCEL_BUILD_TILE_LAYER,
  QUICK_DOWNLOAD_GEOPACKAGE,
  WORKER_READY,
  PROCESS_SOURCE,
  PROCESS_SOURCE_COMPLETED,
  CANCEL_PROCESS_SOURCE,
  CANCEL_PROCESS_SOURCE_COMPLETED,
  ATTACH_MEDIA,
  ATTACH_MEDIA_COMPLETED,
  REQUEST_TILE,
  REQUEST_TILE_COMPLETED,
  CANCEL_TILE_REQUEST,
  GENERATE_GEOTIFF_RASTER_FILE,
  GENERATE_GEOTIFF_RASTER_FILE_COMPLETED,
  REQUEST_REPROJECT_TILE,
  REQUEST_REPROJECT_TILE_COMPLETED,
  CANCEL_REPROJECT_TILE_REQUEST,
  BUILD_TILE_LAYER_STATUS,
  BUILD_TILE_LAYER_COMPLETED,
  WORKER_BUILD_TILE_LAYER,
  WORKER_BUILD_TILE_LAYER_STATUS,
  WORKER_BUILD_TILE_LAYER_COMPLETED,
  CANCEL_BUILD_TILE_LAYER_COMPLETED,
  BUILD_FEATURE_LAYER_STATUS,
  BUILD_FEATURE_LAYER_COMPLETED,
  WORKER_BUILD_FEATURE_LAYER,
  WORKER_BUILD_FEATURE_LAYER_STATUS,
  WORKER_BUILD_FEATURE_LAYER_COMPLETED,
  CANCEL_BUILD_FEATURE_LAYER_COMPLETED,
  IPC_EVENT_CONNECT,
  IPC_EVENT_NOTIFY_MAIN,
  IPC_EVENT_NOTIFY_RENDERERS,
  REQUEST_CLIENT_CREDENTIALS,
  CLIENT_CREDENTIALS_INPUT,
  SELECT_CLIENT_CERTIFICATE,
  CLIENT_CERTIFICATE_SELECTED,
  PROCESS_SOURCE_STATUS,
}
