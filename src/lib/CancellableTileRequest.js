import axios from 'axios'
import _ from 'lodash'
import ServiceConnectionUtils from './ServiceConnectionUtils'
import UniqueIDUtilities from './UniqueIDUtilities'
import { ipcRenderer, remote } from 'electron'

export default class CancellableTileRequest {
  cancelled = false
  source
  axiosRequestScheduler

  /**
   * If a request is currently active, call cancelToken function
   * and set state to cancelled to prevent additional retries
   */
  cancel () {
    this.cancelled = true
    if (!_.isNil(this.source)) {
      const token = this.source.token
      this.source.cancel(ServiceConnectionUtils.USER_CANCELLED_MESSAGE)
      if (!_.isNil(this.axiosRequestScheduler)) {
        this.axiosRequestScheduler.cancel(token)
      }
    }
  }

  timeout () {
    if (!_.isNil(this.source)) {
      const token = this.source.token
      this.source.cancel(ServiceConnectionUtils.TIMEOUT_MESSAGE)
      if (!_.isNil(this.axiosRequestScheduler)) {
        this.axiosRequestScheduler.cancel(token)
      }
    }
  }

  /**
   * Returns the data url of the response, or an error
   * @param axiosRequestScheduler
   * @param url
   * @param retryAttempts
   * @param timeout
   * @returns {Promise<{dataURL: undefined, error: *}>}
   */
  async requestTile (axiosRequestScheduler, url, retryAttempts, timeout) {
    let dataUrl = undefined
    let attempts = 0
    let error

    this.axiosRequestScheduler = axiosRequestScheduler
    while (!this.cancelled && _.isNil(dataUrl) && attempts <= retryAttempts) {
      const requestId = UniqueIDUtilities.createUniqueID()
      const requestTimeoutChannel = 'request-timeout-' + requestId
      const timeoutListener = () => {
        this.timeout()
      }
      const headers = {}
      if (timeout > 0) {
        headers['x-mapcache-timeout'] = timeout
      }
      headers['x-mapcache-connection-id'] = requestId
      headers['x-mapcache-request-origin'] = remote.getCurrentWindow().id
      try {
        ipcRenderer.once(requestTimeoutChannel, timeoutListener)
        const CancelToken = axios.CancelToken
        this.source = CancelToken.source()
        let response = await axiosRequestScheduler.getAxiosInstance()({
          url: url,
          responseType: 'arraybuffer',
          headers: headers,
          cancelToken: this.source.token,
        })
        dataUrl = 'data:' + response.headers['content-type'] + ';base64,' + Buffer.from(response.data).toString('base64')
        error = undefined
      } catch (err) {
        error = err
        // if it is an authentication error, stop retrying
        if (!_.isNil(err) && ServiceConnectionUtils.isAuthenticationErrorResponse(err.response)) {
          break
        }
        // if it is a timeout or the user cancelled the request, remove the error
        if (axios.isCancel(err)) {
          error = undefined
        }
      } finally {
        ipcRenderer.off(requestTimeoutChannel, timeoutListener)
        attempts++
      }
    }
    return {dataUrl, error}
  }
}
