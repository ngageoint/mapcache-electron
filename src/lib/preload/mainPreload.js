import { ipcRenderer } from 'electron'
import FileUtilities from '../util/FileUtilities'
import log from 'electron-log'
import {Context, HtmlCanvasAdapter, SqliteAdapter} from "@ngageoint/geopackage";
Object.assign(console, log.functions)

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
  },
  showProject: (id) => {
    ipcRenderer.send('show-project', id)
  },
  onceProjectShown: (callback) => {
    ipcRenderer.once('show-project-completed', callback)
  },
  createProjectDirectory: () => {
    return FileUtilities.createNextAvailableProjectDirectory(window.mapcache.getUserDataDirectory())
  }
}
