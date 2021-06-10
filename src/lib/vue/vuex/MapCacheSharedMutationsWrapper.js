class MapCacheSharedMutationsWrapper {
  constructor(options, store) {
    this.options = options
    this.store = store
  }

  rendererProcessLogic() {
    // Connect renderer to main process
    window.mapcache.connect()

    // Save original Vuex methods
    this.store.originalCommit = this.store.commit
    this.store.originalDispatch = this.store.dispatch

    // Don't use commit in renderer outside of actions
    this.store.commit = () => {
      throw new Error(`[Vuex Electron] Please, don't use direct commit's, use dispatch instead of this.`)
    }

    // Forward dispatch to main process
    this.store.dispatch = (type, payload) => {
      window.mapcache.notifyMain({ type, payload })
    }

    // Subscribe on changes from main process and apply them
    window.mapcache.onNotifyRenderers((event, { type, payload }) => {
      this.store.originalCommit(type, payload)
    })
  }
}

export default (options = {}) => (store) => {
  const sharedMutations = new MapCacheSharedMutationsWrapper(options, store)
  sharedMutations.rendererProcessLogic()
}
