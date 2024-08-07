import merge from "deepmerge"
import Store from "electron-store"

const SET_STATE_THROTTLE = 0
const STORAGE_NAME = "vuex"
const STORAGE_KEY = "state"
const STORAGE_TEST_KEY = "test"

class PersistedStateMain {
  constructor(options, store) {
    this.options = options
    this.store = store
  }

  loadOptions() {
    if (!this.options.storage) this.options.storage = this.createStorage()
    if (!this.options.storageKey) this.options.storageKey = STORAGE_KEY
    if (!this.options.throttle) this.options.throttle = SET_STATE_THROTTLE
  }

  createStorage() {
    return new Store({ name: this.options.storageName || STORAGE_NAME })
  }

  getState() {
    return this.options.storage.get(this.options.storageKey)
  }

  setState(state) {
    if (process.env.NODE_ENV === "test" || process.type === "browser") {
      this.options.storage.set(this.options.storageKey, state)
    }
  }

  filterInArray(list) {
    return (mutation) => {
      return list.includes(mutation.type)
    }
  }

  checkStorage() {
    try {
      this.options.storage.set(STORAGE_TEST_KEY, STORAGE_TEST_KEY)
      this.options.storage.get(STORAGE_TEST_KEY)
      this.options.storage.delete(STORAGE_TEST_KEY)
    } catch (error) {
      throw new Error("[Vuex Electron] Storage is not valid. Please, read the docs.")
    }
  }

  combineMerge(target, source, options) {
    const emptyTarget = (value) => (Array.isArray(value) ? [] : {})
    const clone = (value, options) => merge(emptyTarget(value), value, options)
    const destination = target.slice()

    source.forEach(function(e, i) {
      if (typeof destination[i] === "undefined") {
        const cloneRequested = options.clone !== false
        const shouldClone = cloneRequested && options.isMergeableObject(e)
        destination[i] = shouldClone ? clone(e, options) : e
      } else if (options.isMergeableObject(e)) {
        destination[i] = merge(target[i], e, options)
      } else if (target.indexOf(e) === -1) {
        destination.push(e)
      }
    })

    return destination
  }

  loadInitialState() {
    const state = this.getState(this.options.storage, this.options.storageKey)

    if (state) {
      const mergedState = merge(this.store.state, state, { arrayMerge: this.combineMerge })
      this.store.replaceState(mergedState)
    }
  }

  subscribeOnChanges() {
    let lastSetStateDate = 0
    let trailingEventTimeout = -1

    this.store.subscribe((mutation, state) => {
      if (this.options.throttle) {
        const now = Date.now()
        if (!lastSetStateDate || now > lastSetStateDate + this.options.throttle) {
          lastSetStateDate = now
          this.setState(state)
        } else {
          clearTimeout(trailingEventTimeout)
          trailingEventTimeout = setTimeout(() => this.setState(state), this.options.throttle)
        }
      } else {
        this.setState(state)
      }
    })
  }
}

export default (options = {}) => (store) => {
  const persistedState = new PersistedStateMain(options, store)
  persistedState.loadOptions()
  persistedState.checkStorage()
  persistedState.loadInitialState()
  persistedState.subscribeOnChanges()
}
