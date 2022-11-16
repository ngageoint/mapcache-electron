import axios from 'axios'
import isNil from 'lodash/isNil'
import { USER_CANCELLED_MESSAGE, isNotFoundError } from './HttpUtilities'
import { createUniqueID } from '../util/UniqueIDUtilities'

export default class CancellableTileRequest {
  cancelled = false
  axiosRequestScheduler
  convertPbfToDataUrl
  requests = []

  constructor (isElectron = false) {
    if (isElectron) {
      const { convertPbfToDataUrl } = require('../util/rendering/MBTilesUtilities')
      this.convertPbfToDataUrl = convertPbfToDataUrl
    } else {
      this.convertPbfToDataUrl = window.mapcache.convertPbfToDataUrl
    }
  }

  /**
   * If a request is currently active, call cancelToken function
   * and set state to cancelled to prevent additional retries
   */
  cancel () {
    this.cancelled = true
    const keys = Object.keys(this.requests)
    while (keys.length > 0) {
      const reqId = keys.shift()
      const request = this.requests[reqId]
      delete this.requests[reqId]
      const token = request.token
      request.cancel(USER_CANCELLED_MESSAGE)
      if (!isNil(this.axiosRequestScheduler)) {
        this.axiosRequestScheduler.cancel(token)
      }
    }
  }

  /**
   * Gets mime type from signature
   * @param signature
   * @returns {string}
   */
  getMimetypeFromSignature = (signature) => {
    let type
    switch (signature) {
      case '89504e47':
        type = 'image/png'
        break
      case '47494638':
        type = 'image/gif'
        break
      case 'ffd8ffe0':
      case 'ffd8ffe1':
      case 'ffd8ffe2':
      case 'ffd8ffe3':
      case 'ffd8ffe8':
        type = 'image/jpeg'
        break
      default:
        break
    }
    return type
  }


  /**
   * Determines the mime type of this buffer
   * @param uint8array
   * @return string
   */
  getMimeTypeFromBuffer (uint8array) {
    let str = ''
    uint8array.slice(0, 4).forEach(byte => str += byte.toString(16))
    let mimeType = this.getMimetypeFromSignature(str)

    if (mimeType == null) {
      throw new Error('Failed to determine mime type of buffer.')
    }

    return mimeType
  }

  /**
   * Returns the data url of the response, or an error
   * @param axiosRequestScheduler
   * @param url
   * @param retryAttempts
   * @param timeout
   * @param withCredentials
   * @param size
   * @returns {Promise<{dataURL: undefined, error: *}>}
   */
  async requestTile (axiosRequestScheduler, url, retryAttempts, timeout, withCredentials = false, size) {
    let dataUrl = null
    let attempts = 0
    let error = null
    this.axiosRequestScheduler = axiosRequestScheduler
    while (!this.cancelled && isNil(dataUrl) && attempts <= retryAttempts) {
      const reqId = createUniqueID()
      try {
        const CancelToken = axios.CancelToken
        const source = CancelToken.source()
        this.requests[reqId] = source
        let response = await axiosRequestScheduler.getAxiosInstance()({
          url: url,
          responseType: 'arraybuffer',
          cancelToken: source.token,
          timeout: timeout,
          withCredentials
        })
        delete this.requests[reqId]
        const contentLength = response.headers['content-length'] || response.headers['Content-Length']
        if (contentLength != null && contentLength === 0) {
          dataUrl = null
          error = null
          break
        }

        const dataBuffer = Buffer.from(response.data)
        if (response.headers['content-type'] === 'image/pbf' || response.headers['content-type'] === 'application/x-protobuf') {
          dataUrl = this.convertPbfToDataUrl(dataBuffer, size.x, size.y)
        } else if (response.headers['content-type'] === 'binary/octet-stream' || response.headers['content-type'] === 'application/octet-stream') {
          dataUrl = 'data:' + this.getMimeTypeFromBuffer(new Uint8Array(response.data)) + ';base64,' + dataBuffer.toString('base64')
        } else {
          dataUrl = 'data:' + response.headers['content-type'] + ';base64,' + dataBuffer.toString('base64')
        }
        error = null
      } catch (err) {
        error = err

        // if it is an authentication error, stop retrying
        if (!isNil(err) && !isNil(err.response) && err.response.status === 401) {
          break
        }

        // if it is a timeout or the user cancelled the request, remove the error
        if (axios.isCancel(err) || (err.message && err.message.toLowerCase().indexOf('timeout') !== -1)) {
          error = null
          // if it is a not found error, we will ignore it and return
        } else if (isNotFoundError(err)) {
          error = null
          break
        }
      } finally {
        delete this.requests[reqId]
        attempts++
      }
    }
    return { dataUrl, error }
  }
}
