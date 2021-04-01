import ProjectActions from '../../../vuex/ProjectActions'
import HttpUtilities from '../../../network/HttpUtilities'
import EventBus from '../../../../EventBus'
import isNil from 'lodash/isNil'

/**
 * This tile layer includes network connection settings such as timeout, retry attempts and number of requests per second (rate limit)
 */
export default class NetworkTileRenderer {
  error
  layer

  constructor (layer) {
    this.layer = layer
    this.rateLimit = this.layer.rateLimit || HttpUtilities.DEFAULT_RATE_LIMIT
    this.retryAttempts = !isNil(this.layer.retryAttempts) ? this.layer.retryAttempts : HttpUtilities.DEFAULT_RETRY_ATTEMPTS
    this.timeoutMs = !isNil(this.layer.timeoutMs) ? this.layer.timeoutMs : HttpUtilities.DEFAULT_TIMEOUT
  }

  setLayer (layer) {
    this.layer = layer
  }

  setError (error) {
    if (error.status === HttpUtilities.TIMEOUT_STATUS) {
      this.error = error
      ProjectActions.setSourceError({id: this.layer.id, error: this.error})
    } else if (error.response && (error.response.status >= 400)) {
      this.error = {
        status: error.response.status,
        statusText: error.response.statusText,
        authType: HttpUtilities.getAuthenticationMethod(error.response)
      }
      ProjectActions.setSourceError({id: this.layer.id, error: this.error})
    } else if (error.request) {
      if (navigator.onLine) {
        this.error = {
          status: -1,
          statusText: 'Unable to reach server.'
        }
        ProjectActions.setSourceError({id: this.layer.id, error: this.error})
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
