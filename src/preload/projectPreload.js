const { clipboard, ipcRenderer } = require('electron')
window.mapcache = {
  getUserDataDirectory: () => {
    return ipcRenderer.sendSync('get-user-data-directory')
  },
  getAppDataDirectory: () => {
    return ipcRenderer.sendSync('get-app-data-directory')
  },
  showOpenDialog: (options) => {
    return new Promise (resolve => {
      ipcRenderer.once('show-open-dialog-completed', (event, result) => {
        resolve(result)
      })
      ipcRenderer.send('show-open-dialog', options)
    })
  },
  showSaveDialog: (options) => {
    return new Promise (resolve => {
      ipcRenderer.once('show-save-dialog-completed', (event, result) => {
        resolve(result)
      })
      ipcRenderer.send('show-save-dialog', options)
    })
  },
  copyToClipboard: (text) => {
    clipboard.writeText(text)
  }
}
