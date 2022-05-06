import isNil from 'lodash/isNil'
import axios from 'axios'
import { DEFAULT_RATE_LIMIT, NO_LIMIT } from './HttpUtilities'

/**
 * Scheduler for axios requests that handles cancellations and timeouts
 */
export default class AxiosRequestScheduler {
  axiosInstance
  intervalMilliseconds
  requestQueue = []
  idle = true
  lastExecutionTime = Date.now()

  /**
   * Constructor
   * @param rateLimit - rate limit in requests per second
   */
  constructor (rateLimit = DEFAULT_RATE_LIMIT) {
    this.axiosInstance = axios.create()
    this.intervalMilliseconds = rateLimit === NO_LIMIT ? 0 : Math.floor(Math.max(1, 1000 / rateLimit))
    this.axiosInstance.interceptors.request.use((config) => {
      return new Promise((resolve, reject) => {
        this.schedule(config, resolve, reject)
      })
    })
  }

  /**
   * Getter for axios instance
   * @returns {*}
   */
  getAxiosInstance () {
    return this.axiosInstance
  }

  /**
   * cleans up any remaining requests
   */
  destroy () {
    this.idle = false
    let request = this.requestQueue.shift()
    while (!isNil(request)) {
      request.reject()
      request = this.requestQueue.shift()
    }
    this.idle = true
  }

  /**
   * Schedules a request, will wait until it can go
   * @param config
   * @param resolve
   * @param reject
   * @returns {number|*}
   */
  schedule (config, resolve, reject) {
    let request = {
      config: config,
      resolve: () => {
        resolve(config)
      },
      reject: () => {
        reject(axios.Cancel)
      },
      cancelled: false
    }
    this.requestQueue.push(request)

    this.wakeUp()
  }

  /**
   * Wakes up from idle
   */
  wakeUp () {
    if (this.idle && this.requestQueue.length > 0) {
      this.idle = false
      setTimeout(() => {
        this.run()
      }, Math.max(0, this.intervalMilliseconds - (Date.now() - this.lastExecutionTime)))
    }
  }

  /**
   * Indicate that a request has been cancelled, find it using the cancel token
   * @param cancelToken
   */
  cancel (cancelToken) {
    let request = this.requestQueue.find(request => request.config.cancelToken === cancelToken)
    if (!isNil(request)) {
      request.cancelled = true
    }
  }

  /**
   * Executes the next request in the queue then goes idle, will schedule next interval to wake up
   */
  run () {
    let request = this.requestQueue.shift()
    // resolve all cancelled requests
    while (!isNil(request) && request.cancelled) {
      request.reject()
      request = this.requestQueue.shift()
    }
    if (!isNil(request)) {
      request.resolve()
      this.lastExecutionTime = Date.now()
    }
    this.idle = true
    this.wakeUp()
  }
}
