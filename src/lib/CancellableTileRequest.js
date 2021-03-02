import axios from 'axios'
import _ from 'lodash'
import ServiceConnectionUtils from './ServiceConnectionUtils'
import UniqueIDUtilities from './UniqueIDUtilities'
import { ipcRenderer } from 'electron'

export default class CancellableTileRequest {
  cancelled = false
  cancelToken

  /**
   * If a request is currently active, call cancelToken function
   * and set state to cancelled to prevent additional retries
   */
  cancel () {
    this.cancelled = true
    if (!_.isNil(this.cancelToken)) {
      this.cancelToken()
    }
  }

  timeout () {
    if (!_.isNil(this.cancelToken)) {
      this.cancelToken()
    }
  }

  /**
   * Returns the data url of the response, or an error
   * @param axiosInstance
   * @param url
   * @param maxAttempts
   * @param timeout
   * @returns {Promise<{dataURL: undefined, error: *}>}
   */
  async requestTile (axiosInstance, url, maxAttempts, timeout) {
    let dataUrl = undefined
    let attempts = 0
    let error

    while (!this.cancelled && _.isNil(dataUrl) && attempts < maxAttempts) {
      const requestId = UniqueIDUtilities.createUniqueID()
      const requestTimeoutChannel = 'cancel-request-' + requestId
      const timeoutListener = () => {
        this.timeout()
      }
      const headers = {}
      if (timeout > 0) {
        headers['x-mapcache-timeout'] = timeout
      }
      headers['x-mapcache-connection-id'] = requestId
      try {
        let self = this
        ipcRenderer.once(requestTimeoutChannel, timeoutListener)
        let response = await axiosInstance({
          method: 'get',
          url: url,
          responseType: 'arraybuffer',
          headers: headers,
          cancelToken: new axios.CancelToken(function executor(c) {
            self.cancelToken = c
          })
        })
        ipcRenderer.off(requestTimeoutChannel, timeoutListener)
        dataUrl = 'data:' + response.headers['content-type'] + ';base64,' + Buffer.from(response.data).toString('base64')
        error = undefined
      } catch (err) {
        ipcRenderer.off(requestTimeoutChannel, timeoutListener)
        error = err
        // if it is an authentication error, stop retrying
        if (ServiceConnectionUtils.isAuthenticationErrorResponse(err.response)) {
          break
        }
        // the tile request was cancelled, therefore, ignore the error
        if (axios.isCancel(err)) {
          error = undefined
          break
        }
      } finally {
        attempts++
      }
    }
    return {dataUrl, error}
  }
}
