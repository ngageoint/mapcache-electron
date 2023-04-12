/**
 * Shared Mutations for the Renderer
 */
class SharedMutationsRenderer {
  constructor (options, store) {
    this.options = options
    this.store = store
  }

  rendererProcessLogic () {
    // Connect renderer to main process
    window.vuex.connect()

    // Save original Vuex methods
    this.store.originalCommit = this.store.commit
    this.store.originalDispatch = this.store.dispatch

    // Don't use commit in renderer outside of actions
    this.store.commit = () => {
      throw new Error(`[Vuex Electron] Please, don't use direct commit's, use dispatch instead of this.`)
    }

    let transactions = {}
    let transaction = 0;

    // Forward dispatch to main process
    this.store.dispatch = (type, payload) => {
      const tId = transaction++
      return new Promise((resolve) => {
        transactions[tId] = resolve
        window.vuex.notifyMain({ id: tId, type, payload })
      })
    }

    // Subscribe on changes from main process and apply them
    window.vuex.onNotifyRenderers((event, { id, type, payload }) => {
      this.store.originalCommit(type, payload)
      if (transactions[id] != null) {
        const resolve = transactions[id]
        resolve()
        delete transactions[id]
      }
    })
  }
}

export default (options = {}) => (store) => {
  const sharedMutations = new SharedMutationsRenderer(options, store)
  sharedMutations.rendererProcessLogic()
}
