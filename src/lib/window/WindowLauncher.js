import {app, BrowserWindow, Menu, shell} from 'electron'
import WindowState from './WindowState'
// import path from 'path'
import _ from 'lodash'
import { download } from 'electron-dl'
import fileUrl from 'file-url'

class WindowLauncher {
  mainWindow
  projectWindow
  loadingWindow
  isShuttingDown = false
  quitFromParent = false

  quit () {
    this.quitFromParent = true
    this.isShuttingDown = true
    if (!_.isNil(this.mainWindow)) {
      this.mainWindow.destroy()
    }
    if (!_.isNil(this.projectWindow)) {
      this.projectWindow.destroy()
    }
    if (!_.isNil(this.loadingWindow)) {
      this.loadingWindow.destroy()
    }
  }

  launchMainWindow () {
    const winURL = process.env.NODE_ENV === 'development'
      ? `http://localhost:9080`
      : `file://${__dirname}/index.html`

    const menu = Menu.buildFromTemplate(this.getMenuTemplate())
    Menu.setApplicationMenu(menu)

    // const mainWindowState = new WindowState('main')
    // let windowOptions = mainWindowState.retrieveState()
    // windowOptions.title = 'MapCache'
    // windowOptions.icon = path.join(__dirname, 'assets/64x64.png')
    // if (_.isNil(windowOptions.minHeight) || windowOptions.minHeight < 600) {
    //   windowOptions.minHeight = 600
    // }
    // if (_.isNil(windowOptions.minWidth) || windowOptions.minWidth < 665) {
    //   windowOptions.minHeight = 665
    // }
    // windowOptions.webPreferences = {
    //   nodeIntegration: true,
    //   contextIsolation: false
    // }
    let windowOptions = {
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      show: false,
      width: 920,
      height: 665,
      minHeight: 665,
      minWidth: 700
    }
    this.mainWindow = new BrowserWindow(windowOptions)
    this.mainWindow.setMenu(menu)
    // mainWindowState.track(this.mainWindow)
    this.mainWindow.loadURL(winURL)
    this.mainWindow.on('ready-to-show', () => {
      this.loadingWindow.hide()
      this.mainWindow.show()
    })
    this.mainWindow.on('close', () => {
      if (!this.quitFromParent) {
        app.quit()
      } else {
        this.isShuttingDown = true
        if (this.projectWindow !== null) {
          this.projectWindow.destroy()
        }
        this.mainWindow = null
      }
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
      width: 1200,
      height: 700,
      minHeight: 700,
      minWidth: 1000,
      useContentSize: true
    }
    this.projectWindow = new BrowserWindow(windowOptions)
    this.projectWindow.on('close', () => {
      if (!this.isShuttingDown) {
        this.mainWindow.show()
        this.launchProjectWindow()
      } else {
        this.projectWindow = null
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
