// event-bus.js
import Vue from 'vue'
import {createUniqueID} from '../util/UniqueIDUtilities'

const EventBus = new Vue()

const Events = {
  CONFIRMATION_MESSAGE: 'confirmation-message',
  CONFIRMATION_MESSAGE_RESPONSE: (id) => 'confirmation-message-response-' + id,
  ALERT_MESSAGE: 'alert-message',
  ZOOM_TO: 'zoom-to',
  PREVIEW_ZOOM_TO: 'preview-zoom-to',
  REORDER_MAP_LAYERS: 'reorder-map-layers',
  SHOW_FEATURE_TABLE: 'show-feature-table',
  NETWORK_ERROR: 'network-error',
  NOMINATIM_SEARCH_RESULTS: 'nominatim-search-results',
  CLEAR_NOMINATIM_SEARCH_RESULTS: 'clear-nominatim-search-results',
  SHOW_NOMINATIM_SEARCH_RESULT: 'show-nominatim-search-result',
  HIGHLIGHT_NOMINATIM_SEARCH_RESULT_ON_MAP: 'highlight-nominatim-search-result-on-map',
  DESELECT_NOMINATIM_SEARCH_RESULT: 'deselect-nominatim-search-result',
  SAVE_NOMINATIM_SEARCH_RESULT: 'save-nominatim-search-result',
  SHOW_FEATURE: 'show-feature',
  EDIT_FEATURE_GEOMETRY: 'edit-feature-geometry',
  EDITED_FEATURE_GEOMETRY: 'edited-feature-geometry',
  STOP_EDITING_FEATURE_GEOMETRY: 'stop-editing-feature-geometry',
  REQUEST_MAP_DETAILS: 'request-map-details',
  RESPONSE_MAP_DETAILS: 'response-map-details',
  DRAW_BOUNDING_BOX: 'draw-bounding-box',
  DRAW_BOUNDING_BOX_STOP: 'draw-bounding-box-stop',
  DRAW_BOUNDING_BOX_CANCELLED: (id) => 'draw-bounding-box-cancelled-' + id,
  GRID_BOUNDING_BOX: 'pick-grid',
  GRID_BOUNDING_BOX_STOP: 'pick-grid-stop',
  GRID_BOUNDING_BOX_CANCELLED: (id) => 'pick-grid-cancelled-' + id,
  BOUNDING_BOX_UPDATED: (id) => 'bounding-box-updated-' + id,
}

EventBus.EventTypes = Events

/**
 * Requests user confirmation and returns the repsonse using the EventBus
 * @param title
 * @param message
 * @param icon
 * @return {Promise<unknown>}
 */
EventBus.requestUserConfirmation = (title, message, icon) => {
  return new Promise (resolve => {
    const id = createUniqueID()
    EventBus.$on(Events.CONFIRMATION_MESSAGE_RESPONSE(id), (approved) => {
      resolve(approved)
    })
    EventBus.$emit(Events.CONFIRMATION_MESSAGE, id, title, message, icon)
  })
}

export default EventBus
