import store from '../../../store'
import { rmDir } from '../../util/FileUtilities'

function setDataSourceVisible ({projectId, sourceId, visible}) {
  store.dispatch('Projects/setDataSourceVisible', {projectId, sourceId, visible})
}

function deleteProject (project) {
  rmDir(store.state.Projects[project.id].directory)
  store.dispatch('UIState/deleteProject', { projectId: project.id.slice() })
  store.dispatch('Projects/deleteProject', { projectId: project.id.slice() })
}

/**
 * ProjectActions is a helper class for performing actions prior to updating the store
 */
export {
  setDataSourceVisible,
  deleteProject
}
