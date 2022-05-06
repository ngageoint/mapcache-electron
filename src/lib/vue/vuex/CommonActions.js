import store from '../../../store'
import { rmDirAsync } from '../../util/file/FileUtilities'

function setDataSourceVisible ({ projectId, sourceId, visible }) {
  return store.dispatch('Projects/setDataSourceVisible', { projectId, sourceId, visible })
}

async function deleteProject (project) {
  rmDirAsync(store.state.Projects[project.id].directory).then((err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('Unable to delete internal project directory: ' + store.state.Projects[project.id].directory)
    }
  })
  await store.dispatch('UIState/deleteProject', { projectId: project.id.slice() })
  await store.dispatch('Projects/deleteProject', { projectId: project.id.slice() })
}

/**
 * ProjectActions is a helper class for performing actions prior to updating the store
 */
export {
  setDataSourceVisible,
  deleteProject
}
