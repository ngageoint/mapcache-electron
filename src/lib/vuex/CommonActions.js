import store from '../../store'
import FileUtilities from '../util/FileUtilities'

/**
 * ProjectActions is a helper class for performing actions prior to updating the store
 */
export default class CommonActions {
  static setDataSourceVisible ({projectId, sourceId, visible}) {
    store.dispatch('Projects/setDataSourceVisible', {projectId, sourceId, visible})
  }

  static deleteProject (project) {
    FileUtilities.rmDir(store.state.Projects[project.id].directory)
    store.dispatch('UIState/deleteProject', { projectId: project.id.slice() })
    store.dispatch('Projects/deleteProject', { projectId: project.id.slice() })
  }
}
