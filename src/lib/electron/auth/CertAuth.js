const { ipcMain } = require('electron')

/**
 * Map of request origin to Promise.
 * @type {Object<string, !Promise<!Electron.Certificate>>}
 */
const promises = {}

/**
 * Get the user certificate to use for the provided URL.
 * @param {string} url The URL.
 * @param {!Array<!Certificate>} list Available user certificates.
 * @param {WebContents} webContents The WebContents instance requesting a certificate.
 * @return {!Promise<!Electron.Certificate>} A promise that resolves to the selected certificate.
 */
function getUserCertForUrl (url, list, webContents) {
  if (!url) {
    return Promise.reject(new Error('URL for certificate request was empty.'))
  }

  // already requesting certificate for url
  if (!promises[url]) {
    promises[url] = new Promise((resolve, reject) => {
      const callback = (event, eventUrl, cert) => {
        if (eventUrl === url) {
          ipcMain.removeListener('client-certificate-selected', callback)
          // An explicit undefined value means the user did not make a choice (ie, page reload), null means the user
          // cancelled the request and a cert should not be used.
          if (cert == null) {
            delete promises[url]
            reject(new Error('Certificate was not selected.'))
          } else {
            resolve(cert)
          }
        }
      }

      ipcMain.on('client-certificate-selected', callback)
      webContents.send('select-client-certificate', {
        url: url,
        certificates: list
      })
    })

    // If the promise is rejected due to page unload, remove the promise so the new session will try again.
    promises[url].catch((err) => {
      if (err && err.message === 'unload') {
        delete promises[url]
      }
    })
  }

  return promises[url]
}

export {
  getUserCertForUrl
}
