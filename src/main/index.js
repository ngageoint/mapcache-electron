'use strict'

import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import WindowState from '../lib/settings/WindowState'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  const mainWindowState = new WindowState('main')
  let windowOptions = mainWindowState.retrieveState()
  windowOptions.title = 'MapCache'
  mainWindow = new BrowserWindow(windowOptions)
  mainWindowState.track(mainWindow)
  mainWindow.loadURL(winURL)

  mainWindow.on('close', () => {
    if (BrowserWindow.getAllWindows().length === 1) {
      app.quit()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  const menuTemplate = getMenuTemplate()
  const menu = Menu.buildFromTemplate(menuTemplate)
  mainWindow.setMenu(menu)
}

ipcMain.on('open-project', (event, projectId) => {
  let projectWindow
  const winURL = process.env.NODE_ENV === 'development'
    ? `http://localhost:9080/?id=${projectId}#/project`
    : `file://${__dirname}/index.html?id=${projectId}#project`

  const projectWindowState = new WindowState('project-' + projectId)
  let windowOptions = projectWindowState.retrieveState()
  projectWindow = new BrowserWindow(windowOptions)
  projectWindowState.track(projectWindow)

  projectWindow.loadURL(winURL)
  projectWindow.on('closed', () => {
    projectWindow = null
  })

  mainWindow.close()
})

function getMenuTemplate () {
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

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  console.log('all closed')
  createWindow()
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
