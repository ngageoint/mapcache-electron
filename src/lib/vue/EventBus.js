// event-bus.js
import Vue from 'vue'

const EventBus = new Vue()

const Events = {
  ALERT_MESSAGE: 'alert-message',
  ZOOM_TO: 'zoom-to',
  PREVIEW_ZOOM_TO: 'preview-zoom-to',
  REORDER_MAP_LAYERS: 'reorder-map-layers',
  SHOW_FEATURE_TABLE: 'show-feature-table',
  NETWORK_ERROR: 'network-error',
  DRAW_BOUNDING_BOX: 'draw-bounding-box',
  DRAW_BOUNDING_BOX_STOP: 'draw-bounding-box-stop',
  DRAW_BOUNDING_BOX_CANCELLED: (id) => 'draw-bounding-box-cancelled-' + id,
  GRID_BOUNDING_BOX: 'pick-grid',
  GRID_BOUNDING_BOX_STOP: 'pick-grid-stop',
  GRID_BOUNDING_BOX_CANCELLED: (id) => 'pick-grid-cancelled-' + id,
  BOUNDING_BOX_UPDATED: (id) => 'bounding-box-updated-' + id,
  NOMINATIM_SEARCH_RESULTS: 'nominatim-search-results',
  CLEAR_NOMINATIM_SEARCH_RESULTS: 'clear-nominatim-search-results',
  SHOW_NOMINATIM_SEARCH_RESULT: 'show-nominatim-search-result',
  HIGHLIGHT_NOMINATIM_SEARCH_RESULT_ON_MAP: 'highlight-nominatim-search-result-on-map',
  DESELECT_NOMINATIM_SEARCH_RESULT: 'deselect-nominatim-search-result',
  SAVE_NOMINATIM_SEARCH_RESULT: 'save-nominatim-search-result',
}

EventBus.EventTypes = Events

export default EventBus
