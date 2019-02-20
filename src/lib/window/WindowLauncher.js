import { BrowserWindow } from 'electron'
import WindowState from './WindowState'

export default class WindowLauncher {
  static launchProjectWindow (projectId) {
    const winURL = process.env.NODE_ENV === 'development'
      ? `http://localhost:9080/?id=${projectId}#/project`
      : `file://${__dirname}/index.html?id=${projectId}#project`

    const projectWindowState = new WindowState('project-' + projectId)
    let windowOptions = projectWindowState.retrieveState()
    let projectWindow = new BrowserWindow(windowOptions)
    projectWindowState.track(projectWindow)

    projectWindow.loadURL(winURL)
    projectWindow.on('closed', () => {
      projectWindow = null
    })
  }
}
