import { app, BrowserWindow, Menu } from 'electron'
import WindowState from './WindowState'

class WindowLauncher {
  mainWindow

  launchMainWindow () {
    const winURL = process.env.NODE_ENV === 'development'
      ? `http://localhost:9080`
      : `file://${__dirname}/index.html`

    const mainWindowState = new WindowState('main')
    let windowOptions = mainWindowState.retrieveState()
    windowOptions.title = 'MapCache'
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
    const menuTemplate = this.getMenuTemplate()
    const menu = Menu.buildFromTemplate(menuTemplate)
    this.mainWindow.setMenu(menu)
  }

  launchProjectWindow (projectId) {
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

    // const fileSubmenu = [
    //   {
    //     label: 'New Project',
    //     accelerator: 'CmdOrCtrl+N',
    //     click: function (item, focusedWindow) {
    //       // Projects.newProject()
    //     }
    //   }
    // ]

    const template = [
      // {
      //   label: 'File',
      //   submenu: fileSubmenu
      // },
      // {
      //   label: 'Edit',
      //   submenu: [
      //     { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
      //     { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
      //     { type: 'separator' },
      //     { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
      //     { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
      //     { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      //     { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      //   ]
      // },
      {
        label: 'View',
        submenu: viewSubmenu
      },
      {
        label: 'Window',
        role: 'window',
        submenu: [
          { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
          { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' }
        ]
      }
    ]

    if (process.platform === 'darwin') {
      const name = app.getName()
      template.unshift({
        label: name,
        submenu: [
          { label: 'About ' + name, role: 'about' },
          { type: 'separator' },
          { label: 'Services', role: 'services', submenu: [] },
          { type: 'separator' },
          { label: 'Hide ' + name, accelerator: 'Command+H', role: 'hide' },
          { label: 'Hide Others', accelerator: 'Command+Shift+H', role: 'hideothers' },
          { label: 'Show All', role: 'unhide' },
          { type: 'separator' },
          { label: 'Quit', accelerator: 'Command+Q', click: function () { app.quit() } }
        ]
      })
      const windowMenu = template.find(function (m) { return m.role === 'window' })
      if (windowMenu) {
        windowMenu.submenu.push(
          { type: 'separator' },
          { label: 'Bring All to Front', role: 'front' }
        )
      }
    }

    return template
  }
}

export default new WindowLauncher()
