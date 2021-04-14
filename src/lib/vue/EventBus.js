// event-bus.js
import Vue from 'vue'

const EventBus = new Vue()

const Events = {
  REORDER_MAP_LAYERS: 'reorder-map-layers',
  SHOW_FEATURE_TABLE: 'show-feature-table',
  SOURCE_INITIALIZING: (sourceId) => 'source-initializing-' + sourceId,
  SOURCE_INITIALIZED: (sourceId) => 'source-initialized-' + sourceId,
  REQUEST_SOURCE_INIT_STATUS: 'request-source-initialization-status',
  NETWORK_ERROR: 'network-error'
}

EventBus.EventTypes = Events

export default EventBus
