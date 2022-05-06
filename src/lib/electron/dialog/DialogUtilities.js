import { ipcRenderer } from 'electron'
import {
  SHOW_OPEN_DIALOG,
  SHOW_OPEN_DIALOG_COMPLETED,
  SHOW_SAVE_DIALOG,
  SHOW_SAVE_DIALOG_COMPLETED
} from '../ipc/MapCacheIPC'

async function showOpenDialog(options) {
  return new Promise(resolve => {
    ipcRenderer.once(SHOW_OPEN_DIALOG_COMPLETED, (event, result) => {
      resolve(result)
    })
    ipcRenderer.send(SHOW_OPEN_DIALOG, options)
  })
}

async function showSaveDialog(options) {
  return new Promise(resolve => {
    ipcRenderer.once(SHOW_SAVE_DIALOG_COMPLETED, (event, result) => {
      resolve(result)
    })
    ipcRenderer.send(SHOW_SAVE_DIALOG, options)
  })
}

export {
  showOpenDialog,
  showSaveDialog
}
