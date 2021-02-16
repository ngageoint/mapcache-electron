import store from '../.'
import _ from 'lodash'
import { mapcache } from '../../../package.json'
import BaseMapUtilities from '../../lib/BaseMapUtilities'
import CredentialsManagement from '../../lib/CredentialsManagement'

const migrations = {
  2: async function (state) {
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
  },
  3: async function (state) {
    // setup initial BaseMaps
    state.BaseMaps = {
      baseMaps: BaseMapUtilities.getDefaultBaseMaps()
    }
  },
  4: async function (state) {
    // remove any existing credentials
    const projectKeys = _.keys(state.Projects)
    for (let i = 0; i < projectKeys.length; i++) {
      const projectId = projectKeys[i]
      const sourceKeys = _.keys(state.Projects[projectId].sources)
      for (let j = 0; j < sourceKeys.length; j++) {
        const sourceId = sourceKeys[j]
        delete state.Projects[projectId].sources[sourceId].credentials
      }
    }
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
            await migrations[i](state)
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e)
            success = false
          }
        } else {
          // eslint-disable-next-line no-console
          console.error('migration script not found. exiting.')
          success = false
        }
      }
      if (success) {
        await Promise.all([
          store.dispatch('Counter/resetState'),
          store.dispatch('UIState/migrateState', {migratedState: state.UIState}),
          store.dispatch('URLs/migrateState', {migratedState: state.URLs}),
          store.dispatch('BaseMaps/migrateState', {migratedState: state.BaseMaps}),
          store.dispatch('Projects/migrateState', {migratedState: state.Projects}),
          store.dispatch('Version/setVersion', installationVersion)])
      }
    } else {
      // store version not set or major revision is off, delete store
      await Promise.all([
        store.dispatch('Counter/resetState'),
        store.dispatch('UIState/resetState'),
        store.dispatch('URLs/resetState'),
        store.dispatch('BaseMaps/resetState'),
        store.dispatch('Projects/resetState'),
        store.dispatch('Version/setVersion', installationVersion)])
    }
  }

  return success
}
