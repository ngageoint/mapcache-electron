import axios from 'axios'
import isNil from 'lodash/isNil'
import {isAuthenticationErrorResponse, USER_CANCELLED_MESSAGE} from './HttpUtilities'

/**
 * Cancellable Service Request allows a user to cancel an ongoing request.
 * Service requests should be made to access capabilities of a service or when connecting for the first time.
 * This class will attempt to make an axios request withCredentials set to false. If it fails, it will attempt the same
 * request withCredentials enabled.
 *
 * Service requests should be made whenever a service is accessed for the first time in th session to ensure the user
 * authenticates, if necessary.
 */
export default class CancellableServiceRequest {
  cancelSource
  cancelled = false
  withCredentials = false

  /**
   * Did the request require credentials
   * @returns {boolean}
   */
  requiredCredentials () {
    return this.withCredentials
  }

  /**
   * If a request is currently active, call cancelToken function
   * and set state to cancelled to prevent additional retries
   */
  cancel () {
    this.cancelled = true
    if (!isNil(this.cancelSource)) {
      this.cancelSource.cancel(USER_CANCELLED_MESSAGE)
    }
  }

  /**
   * Will request the url and return the response.
   * @param url
   * @returns <any>
   */
  async request (url) {
    let response
    let error
    const self = this
    window.mapcache.registerServiceRequestCancelListener(url, () => {
      self.cancel()
    })
    try {
      this.cancelSource = axios.CancelToken.source()
      const request = {
        url: url,
        cancelToken: this.cancelSource.token,
        withCredentials: this.withCredentials,
      }

      await new Promise((resolve => {
        axios(request).then(r => {
          response = r
          resolve()
        }).catch(e => {
          error = e
          resolve()
        })
      }))
      // response = await window.mapcache.webRequest(request)
    } finally {
      window.mapcache.unregisterServiceRequestCancelListener(url)
    }

    if (!isNil(error)) {
      // made a request without credentials and received an authentication error
      // give it a try now with credentials enabled.
      if (!this.cancelled && !this.withCredentials && (error.isAxiosError || isAuthenticationErrorResponse(error.response))) {
        this.withCredentials = true
        response = await this.request(url)
      } else if (!isNil(error)) {
        throw(error)
      }
    }

    return response
  }
}
