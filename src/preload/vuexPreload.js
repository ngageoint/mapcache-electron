import { IPC_EVENT_CONNECT, IPC_EVENT_NOTIFY_MAIN, IPC_EVENT_NOTIFY_RENDERERS } from '../main/lib/ipc/MapCacheIPC'
import Store from 'electron-store'
import { ipcRenderer } from 'electron'

let storage = null

export const vuexElectronAPI = {
  connect (payload) {
    ipcRenderer.send(IPC_EVENT_CONNECT, payload)
  },
  notifyMain (payload) {
    ipcRenderer.send(IPC_EVENT_NOTIFY_MAIN, payload)
  },
  onNotifyRenderers (handler) {
    ipcRenderer.on(IPC_EVENT_NOTIFY_RENDERERS, handler)
  },
  createStorage (name) {
    storage = new Store({ name: name })
  },
  getState (key) {
    return storage.get(key)
  }
}