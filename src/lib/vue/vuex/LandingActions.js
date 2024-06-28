import store from '../../../renderer/src/store/renderer'
import { setDataSourceVisible } from './CommonActions'
import { isRemote } from '../../layer/LayerTypes'

async function newProject (id, name, directory, sources) {
  await store.dispatch('Projects/newProject', { id, name, directory, sources })
  return store.dispatch('UIState/addProjectState', { projectId: id })
}

/**
 * Disables remote sources
 * @param projectId
 */
async function disableRemoteSources (projectId) {
  const sources = Object.values(store.state.Projects[projectId].sources).filter(source => isRemote(source))
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    await setDataSourceVisible(projectId, source.id, false)
  }
}

function setProjectAccessed (projectId) {
  return store.dispatch('Projects/setProjectAccessed', { projectId })
}

export {
  newProject,
  disableRemoteSources,
  setProjectAccessed
}
