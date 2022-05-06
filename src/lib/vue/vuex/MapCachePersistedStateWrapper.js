import merge from 'deepmerge'

const SET_STATE_THROTTLE = 0
const STORAGE_NAME = 'vuex'
const STORAGE_KEY = 'state'


/**
 * MapCachePersistedStateWrapper really just handles importing initial state. it will not actually call set state on changes
 */
class MapCachePersistedStateWrapper {
  constructor (options, store) {
    this.options = options
    this.store = store
  }

  loadOptions () {
    this.options.storageKey = STORAGE_KEY
    if (!this.options.throttle) {
      this.options.throttle = SET_STATE_THROTTLE
    }
    window.mapcache.createStorage(STORAGE_NAME)
  }

  loadFilter (filter, name) {
    if (!filter) {
      return null
    } else if (filter instanceof Array) {
      return this.filterInArray(filter)
    } else if (typeof filter === "function") {
      return filter
    } else {
      throw new Error(`[Vuex Electron] Filter "${name}" should be Array or Function. Please, read the docs.`)
    }
  }

  filterInArray (list) {
    return (mutation) => {
      return list.includes(mutation.type)
    }
  }

  combineMerge (target, source, options) {
    const emptyTarget = (value) => (Array.isArray(value) ? [] : {})
    const clone = (value, options) => merge(emptyTarget(value), value, options)
    const destination = target.slice()

    source.forEach(function (e, i) {
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

  loadInitialState () {
    let state = window.mapcache.getState(this.options.storageKey)
    if (state) {
      const mergedState = merge(this.store.state, state, { arrayMerge: this.combineMerge })
      this.store.replaceState(mergedState)
    }
  }
}

export default (options = {}) => (store) => {
  const persistedState = new MapCachePersistedStateWrapper(options, store)
  persistedState.loadOptions()
  persistedState.loadInitialState()
}
