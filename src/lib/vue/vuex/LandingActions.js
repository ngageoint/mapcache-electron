import store from '../../../store'
import values from 'lodash/values'
import { setDataSourceVisible } from './CommonActions'
import { isRemote } from '../../layer/LayerTypes'

function newProject({id, name, directory}) {
  store.dispatch('Projects/newProject', {id, name, directory})
}

/**
 * Disables remote sources
 * @param projectId
 */
function disableRemoteSources (projectId) {
  values(store.state.Projects[projectId].sources).filter(source => isRemote(source)).forEach(source => {
    setDataSourceVisible({projectId, sourceId: source.id, visible: false})
  })
}

export {
  newProject,
  disableRemoteSources
}
