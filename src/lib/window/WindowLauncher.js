import {app, BrowserWindow, Menu, shell} from 'electron'
import WindowState from './WindowState'
import path from 'path'
import _ from 'lodash'
import { download } from 'electron-dl'
import fileUrl from 'file-url'

class WindowLauncher {
  mainWindow
  projectWindow
  loadingWindow
  isShuttingDown = false

  launchMainWindow () {
    const winURL = process.env.NODE_ENV === 'development'
      ? `http://localhost:9080`
      : `file://${__dirname}/index.html`

    const menu = Menu.buildFromTemplate(this.getMenuTemplate())
    Menu.setApplicationMenu(menu)

    const mainWindowState = new WindowState('main')
    let windowOptions = mainWindowState.retrieveState()
    windowOptions.title = 'MapCache'
    windowOptions.icon = path.join(__dirname, 'assets/64x64.png')
    windowOptions.webPreferences = {
      nodeIntegration: true,
      contextIsolation: false
    }
    windowOptions.show = false
    this.mainWindow = new BrowserWindow(windowOptions)
    this.mainWindow.setMenu(menu)
    // this.mainWindow.toggleDevTools()
    mainWindowState.track(this.mainWindow)
    this.mainWindow.loadURL(winURL)
    this.mainWindow.on('ready-to-show', () => {
      this.loadingWindow.hide()
      this.mainWindow.show()
    })
    this.mainWindow.on('close', () => {
      this.isShuttingDown = true
      app.quit()
    })
  }

  launchLoaderWindow () {
    const winURL = process.env.NODE_ENV === 'development'
      ? `http://localhost:9080/static/loader.html`
      : `file://${__dirname}/../../../static/loader.html`
    let windowOptions = {
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      frame: false,
      width: 264,
      height: 264,
      transparent: true
    }
    this.loadingWindow = new BrowserWindow(windowOptions)
    this.loadingWindow.loadURL(winURL)
  }

  launchProjectWindow () {
    let windowOptions = {
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      show: false,
      width: 1000,
      height: 800
    }
    this.projectWindow = new BrowserWindow(windowOptions)
    this.projectWindow.on('close', (e) => {
      if (!this.isShuttingDown) {
        e.preventDefault()
        this.projectWindow.hide()
        this.mainWindow.show()
      }
    })
  }

  downloadURL = async (url) => {
    try {
      await download(this.projectWindow, fileUrl(url))
    } catch (error) {
      console.error(error)
    }
  }

  showProject (projectId) {
    try {
      const winURL = process.env.NODE_ENV === 'development'
        ? `http://localhost:9080/?id=${projectId}#/project`
        : `file://${__dirname}/index.html?id=${projectId}#project`

      const projectWindowState = new WindowState('project-' + projectId)
      let windowState = _.clone(projectWindowState.retrieveState())
      if (windowState) {
        if (windowState.width && windowState.height) {
          this.projectWindow.setSize(windowState.width, windowState.height)
        }
      }
      projectWindowState.track(this.projectWindow)
      this.projectWindow.loadURL(winURL)
      this.projectWindow.on('ready-to-show', () => {
        this.projectWindow.show()
        this.mainWindow.send('show-project-completed')
        setTimeout(() => {
          this.mainWindow.hide()
        }, 250)
      })
    } catch (e) {
      console.error(e)
    }
  }

  getMenuTemplate () {
    const viewSubmenu = [
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: function (item, focusedWindow) {
          if (focusedWindow) {
            focusedWindow.reload()
          }
        }
      },
      {
        label: 'Toggle Full Screen',
        accelerator: (function () {
          if (process.platform === 'darwin') {
            return 'Ctrl+Command+F'
          } else {
            return 'F11'
          }
        })(),
        click: function (item, focusedWindow) {
          if (focusedWindow) {
            focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
          }
        }
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: (function () {
          if (process.platform === 'darwin') { return 'Alt+Command+I' } else { return 'Ctrl+Shift+I' }
        })(),
        click: function (item, focusedWindow) {
          if (focusedWindow) { focusedWindow.toggleDevTools() }
        }
      }
    ]

    const template = [
      {
        label: 'Edit',
        submenu: [
          {role: 'copy'},
          {role: 'paste'},
          {role: 'selectall'}
        ]
      },
      {
        label: 'View',
        submenu: viewSubmenu
      },
      {
        role: 'window',
        submenu: [
          {
            role: 'minimize'
          },
          {
            role: 'close'
          }
        ]
      },
      {
        role: 'help',
        submenu: [
          {
            label: 'Learn More',
            click () {
              shell.openExternal('https://github.com/ngageoint/mapcache-electron')
            }
          },
          {
            label: 'Documentation',
            click () {
              shell.openExternal(
                `https://github.com/ngageoint/mapcache-electron/blob/0.0.10/README.md`
              )
            }
          }
        ]
      }
    ]

    if (process.platform === 'darwin') {
      template.unshift({
        label: 'MapCache',
        submenu: [
          {
            role: 'about'
          },
          {
            type: 'separator'
          },
          {
            role: 'services',
            submenu: []
          },
          {
            type: 'separator'
          },
          {
            role: 'hide'
          },
          {
            role: 'hideothers'
          },
          {
            role: 'unhide'
          },
          {
            type: 'separator'
          },
          {
            role: 'quit'
          }
        ]
      })
      template[3].submenu = [
        {
          role: 'close'
        },
        {
          role: 'minimize'
        },
        {
          role: 'zoom'
        },
        {
          type: 'separator'
        },
        {
          role: 'front'
        }
      ]
    } else {
      template.unshift({
        label: 'File',
        submenu: [{
          role: 'quit'
        }]
      })
    }

    return template
  }
}

export default new WindowLauncher()
