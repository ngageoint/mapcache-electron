import TileLayer from './TileLayer'
import _ from 'lodash'
import NetworkConstants from '../../../NetworkConstants'
import ServiceConnectionUtils from '../../../ServiceConnectionUtils'
import ActionUtilities from '../../../ActionUtilities'
import EventBus from '../../../../EventBus'

export default class NetworkTileLayer extends TileLayer {
  constructor (configuration) {
    super(configuration)
    this.rateLimit = this._configuration.rateLimit || NetworkConstants.DEFAULT_RATE_LIMIT
    this.retryAttempts = !_.isNil(this._configuration.retryAttempts) ? this._configuration.retryAttempts : NetworkConstants.DEFAULT_RETRY_ATTEMPTS
    this.timeoutMs = this._configuration.timeoutMs || NetworkConstants.DEFAULT_TIMEOUT
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

  updateNetworkSettings (configuration) {
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

  hasError () {
    return !_.isNil(this.error)
  }

  setError (error) {
    // not a timeout error
    if (error.code !== "ECONNABORTED") {
      if (error.response && (error.response.status >= 500 || error.response.status === 401)) {
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
  }

  renderTile () {
    throw new Error('Abstract method to be implemented in subclass')
  }
}
