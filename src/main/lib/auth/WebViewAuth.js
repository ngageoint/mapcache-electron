import { getClientCredentials } from './BasicAuth'
import { WEB_VIEW_AUTH_RESPONSE } from '../ipc/MapCacheIPC'
import { USER_CANCELLED_MESSAGE } from '../../../lib/network/HttpUtilities'

/**
 * Class for handling WebView like auth requests using Electron's BrowserView
 */
export default class WebViewAuth {
  // window this browser view will be attached to
  attachWindow = null
  // internal web contents
  webContents = null
  // sender of the auth request event
  authBrowserEventSender = null
  // flag to check if auth is finished
  finished = false
  // target url
  authBrowserTargetURL

  constructor (webContents, attachWindow, url) {
    this.webContents = webContents
    this.attachWindow = attachWindow
    this.authBrowserEventSender = attachWindow.webContents
    this.authBrowserTargetURL = url
    this.webContents.on('login', (event, details, authInfo, callback) => {
      event.preventDefault()
      getClientCredentials(details, authInfo, callback, attachWindow.webContents, (error) => {
        if (error != null) {
          this.authBrowserEventSender.send(WEB_VIEW_AUTH_RESPONSE, {
            error: error
          })
          this.finish()
        }
      })
    })
  }

  /**
   * Returns true if the browser view is no longer in use
   * @returns {boolean}
   */
  isFinished () {
    return this.finished
  }

  userCancel () {
    this.sendResponse({
      error: {
        message: USER_CANCELLED_MESSAGE
      }
    })
    this.finish()
  }

  /**
   * Finishes the use of this browser view
   */
  finish () {
    this.removeBrowserView()
    this.webContents = null
    this.attachWindow = null
    this.finished = true
  }

  /**
   * Removes the browser view
   */
  removeBrowserView () {
    if (this.webContents != null) {
      this.webContents.closeDevTools()
      this.webContents = null
    }
  }

  /**
   * Sends the response back to the invoking window
   * @param response
   */
  sendResponse (response = {}) {
    this.authBrowserEventSender.send(WEB_VIEW_AUTH_RESPONSE, response)
  }

  /**
   * Handle web request complete
   * @param details
   * @param handleWebViewFailure
   */
  onWebRequestCompleted (details, handleWebViewFailure) {
    // response from auth ended in failure
    if (this.webContents != null && details.webContentsId === this.webContents.id && details.statusCode >= 400) {
      this.authBrowserEventSender.send(WEB_VIEW_AUTH_RESPONSE, {
        error: {
          response: {
            statusText: 'Invalid credentials.',
            status: 401
          }
        }
      })
      handleWebViewFailure()
      this.finish()
    }
    if (!this.isFinished() && details.url === this.authBrowserTargetURL && details.webContentsId === this.webContents.id) {
      if (this.authBrowserEventSender) {
        this.sendResponse()
      }
      this.finish()
    }
  }

  /**
   * Handle web request error
   * @param details
   */
  onWebRequestErrored (details) {
    if (this.webContents != null && details.webContentsId === this.webContents.id) {
      if (this.authBrowserEventSender) {
        this.sendResponse({
          error: details.error
        })
      }
      this.finish()
    }
  }
}