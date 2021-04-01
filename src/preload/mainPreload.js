const { ipcRenderer } = require('electron')

window.mapcache = {
  getAppVersion: () => {
    return ipcRenderer.sendSync('get-app-version')
  }
}
