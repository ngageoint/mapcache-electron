import TileLayer from './TileLayer'
import _ from 'lodash'
import NetworkConstants from '../../../NetworkConstants'
import ServiceConnectionUtils from '../../../ServiceConnectionUtils'
import ActionUtilities from '../../../ActionUtilities'
import EventBus from '../../../../EventBus'

/**
 * This tile layer includes network connection settings such as timeout, retry attempts and number of requests per second (rate limit)
 */
export default class NetworkTileLayer extends TileLayer {
  constructor (configuration) {
    super(configuration)
    this.rateLimit = this._configuration.rateLimit || NetworkConstants.DEFAULT_RATE_LIMIT
    this.retryAttempts = !_.isNil(this._configuration.retryAttempts) ? this._configuration.retryAttempts : NetworkConstants.DEFAULT_RETRY_ATTEMPTS
    this.timeoutMs = !_.isNil(this._configuration.timeoutMs) ? this._configuration.timeoutMs : NetworkConstants.DEFAULT_TIMEOUT
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        rateLimit: this.rateLimit,
        retryAttempts: this.retryAttempts,
        timeoutMs: this.timeoutMs,
      }
    }
  }

  update (configuration) {
    super.update(configuration)
    if (!_.isNil(configuration.rateLimit)) {
      this.rateLimit = configuration.rateLimit
    }
    if (!_.isNil(configuration.retryAttempts)) {
      this.retryAttempts = configuration.retryAttempts
    }
    if (!_.isNil(configuration.timeoutMs)) {
      this.timeoutMs = configuration.timeoutMs
    }
  }

  getRepaintFields() {
    return ['rateLimit', 'retryAttempts', 'timeoutMs'].concat(super.getRepaintFields())
  }

  hasError () {
    return !_.isNil(this.error)
  }

  setError (error) {
    if (error.status === ServiceConnectionUtils.TIMEOUT_STATUS) {
      this.error = error
      ActionUtilities.setSourceError({id: this.id, error: this.error})
    } else if (error.response && (error.response.status >= 400)) {
      this.error = {
        status: error.response.status,
        statusText: error.response.statusText,
        authType: ServiceConnectionUtils.getAuthenticationMethod(error.response)
      }
      ActionUtilities.setSourceError({id: this.id, error: this.error})
    } else if (error.request) {
      if (navigator.onLine) {
        this.error = {
          status: -1,
          statusText: 'Unable to reach server.'
        }
        ActionUtilities.setSourceError({id: this.id, error: this.error})
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
