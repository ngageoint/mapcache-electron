import {app, BrowserWindow, Menu, shell} from 'electron'
import WindowState from './WindowState'
import path from 'path'

class WindowLauncher {
  mainWindow

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
    this.mainWindow = new BrowserWindow(windowOptions)
    mainWindowState.track(this.mainWindow)
    this.mainWindow.loadURL(winURL)

    this.mainWindow.on('close', () => {
      if (BrowserWindow.getAllWindows().length === 1) {
        app.quit()
      }
    })

    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })
    this.mainWindow.setMenu(menu)
    const ses = this.mainWindow.webContents.session
    console.log(ses.getUserAgent())
  }

  launchProjectWindow (projectId) {
    const winURL = process.env.NODE_ENV === 'development'
      ? `http://localhost:9080/?id=${projectId}#/project`
      : `file://${__dirname}/index.html?id=${projectId}#project`

    const projectWindowState = new WindowState('project-' + projectId)
    let windowOptions = projectWindowState.retrieveState()
    windowOptions.webPreferences = {
      nodeIntegration: true,
      contextIsolation: false
    }
    let projectWindow = new BrowserWindow(windowOptions)
    projectWindowState.track(projectWindow)

    projectWindow.loadURL(winURL)
    projectWindow.on('closed', () => {
      projectWindow = null
    })

    this.mainWindow.close()
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
                `https://github.com/ngageoint/mapcache-electron/blob/0.0.9/README.md`
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
