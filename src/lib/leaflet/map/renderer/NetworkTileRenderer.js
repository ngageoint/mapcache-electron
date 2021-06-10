import { DEFAULT_RETRY_ATTEMPTS, DEFAULT_TIMEOUT, DEFAULT_RATE_LIMIT, TIMEOUT_STATUS, getAuthenticationMethod} from '../../../network/HttpUtilities'
import EventBus from '../../../vue/EventBus'
import isNil from 'lodash/isNil'

/**
 * This tile layer includes network connection settings such as timeout, retry attempts and number of requests per second (rate limit)
 */
export default class NetworkTileRenderer {
  error
  layer

  constructor (layer) {
    this.layer = layer
    this.rateLimit = this.layer.rateLimit || DEFAULT_RATE_LIMIT
    this.retryAttempts = !isNil(this.layer.retryAttempts) ? this.layer.retryAttempts : DEFAULT_RETRY_ATTEMPTS
    this.timeoutMs = !isNil(this.layer.timeoutMs) ? this.layer.timeoutMs : DEFAULT_TIMEOUT
  }

  setLayer (layer) {
    this.layer = layer
  }

  setError (error) {
    if (error.status === TIMEOUT_STATUS) {
      this.error = error
      window.mapcache.setSourceError({id: this.layer.id, error: this.error})
    } else if (error.response && (error.response.status >= 400)) {
      this.error = {
        status: error.response.status,
        statusText: error.response.statusText,
        authType: getAuthenticationMethod(error.response)
      }
      window.mapcache.setSourceError({id: this.layer.id, error: this.error})
    } else if (error.request) {
      if (navigator.onLine) {
        this.error = {
          status: -1,
          statusText: 'Unable to reach server.'
        }
        window.mapcache.setSourceError({id: this.layer.id, error: this.error})
      } else {
        // notify there may be a network error
        EventBus.$emit(EventBus.EventTypes.NETWORK_ERROR)
      }
    }
  }

  renderTile () {
    throw new Error('Abstract method to be implemented in subclass')
  }
}
