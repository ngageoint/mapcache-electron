import store from '../../../store'
import values from 'lodash/values'
import { setDataSourceVisible } from './CommonActions'
import { isRemote } from '../../layer/LayerTypes'
import { getOrCreateGeoPackageForApp } from '../../geopackage/GeoPackageCommon'

async function newProject({id, name, directory}) {
  await store.dispatch('Projects/newProject', {id, name, directory})
  return store.dispatch('UIState/addProjectState', {projectId: id})
}

/**
 * Disables remote sources
 * @param projectId
 */
async function disableRemoteSources (projectId) {
  const sources = values(store.state.Projects[projectId].sources).filter(source => isRemote(source))
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    await setDataSourceVisible({projectId, sourceId: source.id, visible: false})
  }
}

async function addGeoPackage ({projectId, filePath}) {
  const geopackage = await getOrCreateGeoPackageForApp(filePath)
  if (geopackage != null) {
    await store.dispatch('Projects/setGeoPackage', {projectId, geopackage})
    return geopackage.id
  } else {
    return null
  }
}

function setProjectAccessed (projectId) {
  store.dispatch('Projects/setProjectAccessed', {projectId})
}

export {
  newProject,
  disableRemoteSources,
  addGeoPackage,
  setProjectAccessed
}
