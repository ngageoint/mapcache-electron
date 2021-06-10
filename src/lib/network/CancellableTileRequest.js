import axios from 'axios'
import isNil from 'lodash/isNil'
import { createUniqueID } from '../util/UniqueIDUtilities'
import { USER_CANCELLED_MESSAGE, TIMEOUT_MESSAGE } from './HttpUtilities'

export default class CancellableTileRequest {
  cancelled = false
  source
  axiosRequestScheduler
  registerRequestTimeoutListener
  unregisterRequestTimeoutListener

  /**
   * Constructor
   * @param isElectron - used to specify the context. if the context is the browser, it will need to use the mapcache api, otherwise it can import electron libraries
   */
  constructor (isElectron = false) {
    if (isElectron) {
      const { ipcRenderer } = require('electron')
      this.registerRequestTimeoutListener = (requestId, listener) => {
        const channel = 'request-timeout-' + requestId
        ipcRenderer.once(channel, listener)
      }
      this.unregisterRequestTimeoutListener = (requestId, listener) => {
        const channel = 'request-timeout-' + requestId
        ipcRenderer.off(channel, listener)
      }
    } else {
      this.registerRequestTimeoutListener = window.mapcache.registerRequestTimeoutListener
      this.unregisterRequestTimeoutListener = window.mapcache.unregisterRequestTimeoutListener
    }
  }

  /**
   * If a request is currently active, call cancelToken function
   * and set state to cancelled to prevent additional retries
   */
  cancel () {
    this.cancelled = true
    if (!isNil(this.source)) {
      const token = this.source.token
      this.source.cancel(USER_CANCELLED_MESSAGE)
      if (!isNil(this.axiosRequestScheduler)) {
        this.axiosRequestScheduler.cancel(token)
      }
    }
  }

  timeout () {
    if (!isNil(this.source)) {
      const token = this.source.token
      this.source.cancel(TIMEOUT_MESSAGE)
      if (!isNil(this.axiosRequestScheduler)) {
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
    while (!this.cancelled && isNil(dataUrl) && attempts <= retryAttempts) {
      const requestId = createUniqueID()
      const timeoutListener = () => {
        this.timeout()
      }
      const headers = {}
      if (timeout > 0) {
        headers['x-mapcache-timeout'] = timeout
      }
      headers['x-mapcache-connection-id'] = requestId
      try {
        this.registerRequestTimeoutListener(requestId, timeoutListener)
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
        if (!isNil(err) && !isNil(err.response) && err.response.status === 401) {
          break
        }
        // if it is a timeout or the user cancelled the request, remove the error
        if (axios.isCancel(err)) {
          error = undefined
        }
      } finally {
        this.unregisterRequestTimeoutListener(requestId, timeoutListener)
        attempts++
      }
    }
    return {dataUrl, error}
  }
}
