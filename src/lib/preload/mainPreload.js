const { ipcRenderer } = require('electron')
window.mapcache = {
  getUserDataDirectory: () => {
    return ipcRenderer.sendSync('get-user-data-directory')
  },
  getAppDataDirectory: () => {
    return ipcRenderer.sendSync('get-app-data-directory')
  },
  getAppVersion: () => {
    return ipcRenderer.sendSync('get-app-version')
  },
  openExternal: (link) => {
    ipcRenderer.send('open-external', link)
  }
}
