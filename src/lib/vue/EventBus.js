// event-bus.js
import Vue from 'vue'

const EventBus = new Vue()

const Events = {
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

}

EventBus.EventTypes = Events

export default EventBus
