import store from '../../../store/renderer'

function setDataSourceVisible (projectId, sourceId, visible) {
  return store.dispatch('Projects/setDataSourceVisible', { projectId, sourceId, visible })
}

async function deleteProject (projectId) {
  const folder = store.state.Projects[projectId].directory
  const deleted = await window.mapcache.deleteProjectFolder(folder)
  if (!deleted) {
    // eslint-disable-next-line no-console
    console.error('Unable to delete internal project directory: ' + this.store.state.Projects[projectId].directory)
  }
  await store.dispatch('UIState/deleteProject', { projectId: projectId })
  await store.dispatch('Projects/deleteProject', { projectId: projectId })
}

async function addGeoPackage (projectId, filePath) {
  const geopackage = await window.mapcache.getOrCreateGeoPackageForApp(filePath)
  if (geopackage != null) {
    await store.dispatch('Projects/setGeoPackage', { projectId, geopackage })
    return geopackage.id
  } else {
    return null
  }
}

export {
  setDataSourceVisible,
  addGeoPackage,
  deleteProject
}