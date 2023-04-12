import { ipcMain } from 'electron'
import { IPC_EVENT_CONNECT, IPC_EVENT_NOTIFY_MAIN, IPC_EVENT_NOTIFY_RENDERERS } from '../../../electron/lib/ipc/MapCacheIPC'

class SharedMutationsMain {
  constructor (options, store) {
    this.options = options
    this.store = store
  }

  onConnect(handler) {
    ipcMain.on(IPC_EVENT_CONNECT, handler)
  }

  onNotifyMain(handler) {
    ipcMain.on(IPC_EVENT_NOTIFY_MAIN, handler)
  }

  notifyRenderers(connections, payload) {
    Object.keys(connections).forEach((processId) => {
      connections[processId].send(IPC_EVENT_NOTIFY_RENDERERS, payload)
    })
  }

  mainProcessLogic() {
    const connections = {}

    // Save new connection
    this.onConnect((event) => {
      const win = event.sender
      const winId = win.id

      connections[winId] = win

      // Remove connection when window is closed
      win.on("destroyed", () => {
        delete connections[winId]
      })
    })

    // Subscribe on changes from renderer processes
    this.onNotifyMain((event, { id, type, payload }) => {
      this.store.dispatch(type, payload).then(() => {
        this.notifyRenderers(connections, { id, type, payload })
      })
    })

    // // Subscribe on changes from Vuex store
    // this.store.subscribe((mutation) => {
    //   const { type, payload } = mutation
    //
    //   // Forward changes to renderer processes
    //   this.notifyRenderers(connections, { type, payload })
    // })
  }
}

export default (options = {}) => (store) => {
  const sharedMutations = new SharedMutationsMain(options, store)
  sharedMutations.mainProcessLogic()
}
