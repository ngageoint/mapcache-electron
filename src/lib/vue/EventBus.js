// event-bus.js
import Vue from 'vue'

const EventBus = new Vue()

const Events = {
  REORDER_MAP_LAYERS: 'reorder-map-layers',
  SHOW_FEATURE_TABLE: 'show-feature-table',
  NETWORK_ERROR: 'network-error'
}

EventBus.EventTypes = Events

export default EventBus
