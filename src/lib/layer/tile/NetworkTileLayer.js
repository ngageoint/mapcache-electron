import isNil from 'lodash/isNil'
import TileLayer from './TileLayer'
import { DEFAULT_RATE_LIMIT, DEFAULT_TIMEOUT, DEFAULT_RETRY_ATTEMPTS } from '../../network/HttpUtilities'

/**
 * This tile layer includes network connection settings such as timeout, retry attempts and number of requests per second (rate limit)
 */
export default class NetworkTileLayer extends TileLayer {
  constructor (configuration = {}) {
    super(configuration)
    this.rateLimit = this._configuration.rateLimit || DEFAULT_RATE_LIMIT
    this.retryAttempts = !isNil(this._configuration.retryAttempts) ? this._configuration.retryAttempts : DEFAULT_RETRY_ATTEMPTS
    this.timeoutMs = !isNil(this._configuration.timeoutMs) ? this._configuration.timeoutMs : DEFAULT_TIMEOUT
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
    if (!isNil(configuration.rateLimit)) {
      this.rateLimit = configuration.rateLimit
    }
    if (!isNil(configuration.retryAttempts)) {
      this.retryAttempts = configuration.retryAttempts
    }
    if (!isNil(configuration.timeoutMs)) {
      this.timeoutMs = configuration.timeoutMs
    }
  }

  getRepaintFields() {
    return ['rateLimit', 'retryAttempts', 'timeoutMs'].concat(super.getRepaintFields())
  }
}
