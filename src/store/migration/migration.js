import store from '../.'
import _ from 'lodash'
import { mapcache } from '../../../package.json'

const migrations = {
  2: function (state) {
    // setup initial state for tabNotification, mapZoom, and preview layer
    _.keys(state.UIState).forEach(projectId => {
      state.UIState[projectId].tabNotification = {0: false, 1: false, 2: false}
      state.UIState[projectId].mapZoom = 3
      state.UIState[projectId].previewLayer = null
    })

    // setup initial mapRenderingOrder, also set all layers to not be visible
    _.keys(state.Projects).forEach(projectId => {
      _.keys(state.Projects[projectId].sources).forEach(sourceId => {
        state.Projects[projectId].sources[sourceId].visible = false
      })
      _.keys(state.Projects[projectId].geopackages).forEach(geopackageId => {
        _.keys(state.Projects[projectId].geopackages[geopackageId].tables.tiles).forEach(table => {
          state.Projects[projectId].geopackages[geopackageId].tables.tiles[table].visible = false
        })
        _.keys(state.Projects[projectId].geopackages[geopackageId].tables.features).forEach(table => {
          state.Projects[projectId].geopackages[geopackageId].tables.features[table].visible = false
        })
      })
      state.Projects[projectId].mapRenderingOrder = []
    })
  }
}

/**
 * Executes the necessary migration scripts based on current version of the store and the installation version of the store
 * @returns {Promise<boolean>}
 */
export default async function runMigration () {
  let success = true
  // check if store is out of date, if so, delete content
  let currentVersion = parseInt(store.state.Version ? store.state.Version.version : '-1')
  let installationVersion = parseInt(mapcache.store.version)
  if (currentVersion !== installationVersion) {
    // if the current version isn't set or this is a downgrade, reset state to this version's defaults, otherwise run the migration
    const requiresReset = currentVersion < 1 || installationVersion < currentVersion
    if (!requiresReset) {
      let state = _.cloneDeep(store.state)
      for (let i = currentVersion + 1; i <= installationVersion; i++) {
        if (migrations[i]) {
          try {
            migrations[i](state)
          } catch (e) {
            console.error(e)
            success = false
          }
        } else {
          console.error('migration script not found. exiting.')
          success = false
        }
      }
      if (success) {
        await Promise.all([
          store.dispatch('Counter/resetState'),
          store.dispatch('UIState/migrateState', {migratedState: state.UIState}),
          store.dispatch('URLs/migrateState', {migratedState: state.URLs}),
          store.dispatch('Projects/migrateState', {migratedState: state.Projects}),
          store.dispatch('Version/setVersion', installationVersion)])
      }
    } else {
      // store version not set or major revision is off, delete store
      await Promise.all([
        store.dispatch('Counter/resetState'),
        store.dispatch('UIState/resetState'),
        store.dispatch('URLs/resetState'),
        store.dispatch('Projects/resetState'),
        store.dispatch('Version/setVersion', installationVersion)])
    }
  }
  return success
}
