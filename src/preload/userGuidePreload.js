import { contextBridge, ipcRenderer } from 'electron'
import {
  OPEN_EXTERNAL,
} from '../main/lib/ipc/MapCacheIPC'
import { environment } from '../lib/env/env'

const allowedOpenExternalLinks = []
if (environment.geopackageUrl != null) {
  allowedOpenExternalLinks.push(environment.geopackageUrl)
}
contextBridge.exposeInMainWorld('mapcache', {
  openExternal: (link) => {
    if (allowedOpenExternalLinks.indexOf(link) !== -1) {
      ipcRenderer.send(OPEN_EXTERNAL, link)
    }
  },
})
