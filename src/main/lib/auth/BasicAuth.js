import { CLIENT_CREDENTIALS_INPUT, REQUEST_CLIENT_CREDENTIALS } from '../ipc/MapCacheIPC'

import { ipcMain } from 'electron'
import CredentialsManagement from './CredentialsManagement'

/**
 * Map of request origin to Promise.
 */
const promises = {}

/**
 * Get user's credentials for a given url
 * @param details
 * @param authInfo
 * @param webContents
 * @returns {Promise<*>}
 */
async function getUserCredentialsForUrl (details, authInfo, webContents) {
  const url = [authInfo.host, authInfo.port].join(':')
  // already requesting credentials for url,
  if (!promises[url]) {
    promises[url] = new Promise((resolve, reject) => {
      const callback = (event, eventUrl, credentials) => {
        if (eventUrl === url) {
          ipcMain.removeListener(CLIENT_CREDENTIALS_INPUT, callback)
          delete promises[url]
          // An explicit undefined value means the user did not make a choice (ie, page reload), null means the user
          // cancelled the request and a credentials should not be used.
          if (credentials == null) {
            reject(new Error('Credentials not provided.'))
          } else {
            resolve(credentials)
          }
        }
      }
      ipcMain.on(CLIENT_CREDENTIALS_INPUT, callback)
      webContents.send(REQUEST_CLIENT_CREDENTIALS, {
        authInfo: authInfo,
        eventUrl: url,
        details: details
      })
    })
  }

  return promises[url]
}


/**
 * Get client credentials for the provided URL.
 * @param details
 * @param authInfo
 * @param callback The callback to call on certificate selection.
 * @param webContents The WebContents instance requesting a certificate.
 */
function getClientCredentials (details, authInfo, callback, webContents, internalCallback = () => {}) {
  getUserCredentialsForUrl(details, authInfo, webContents).then((credentials) => {
    if (credentials) {
      callback(credentials.username, CredentialsManagement.decrypt(credentials.password, credentials.iv, credentials.key))
      internalCallback()
    } else {
      callback()
      internalCallback('No credentials provided.')
    }
  }).catch((err) => {
    // This intentionally doesn't call the callback, because Electron will remember the decision. If the app was
    // refreshed, we want Electron to try selecting a cert again when the app loads.
    const reason = err && err.message || 'Unspecified reason.'
    // eslint-disable-next-line no-console
    callback()
    internalCallback(`Client credentials input failed: ${reason}`)
  })
}


export {
  getClientCredentials
}
