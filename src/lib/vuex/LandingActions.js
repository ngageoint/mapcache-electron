import store from '../../store'
import values from 'lodash/values'
import CommonActions from './CommonActions'
import LayerTypes from '../source/layer/LayerTypes'

/**
 * ProjectActions is a helper class for performing actions prior to updating the store
 */
export default class LandingActions {
  static newProject ({id, name, directory}) {
    store.dispatch('Projects/newProject', {id, name, directory})
  }

  /**
   * Disables remote sources
   * @param projectId
   */
  static disableRemoteSources(projectId) {
    const sources = values(store.state.Projects[projectId].sources)
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i]
      if (LayerTypes.isRemote(source)) {
        CommonActions.setDataSourceVisible({projectId, sourceId: source.id, visible: false})
      }
    }
  }

}
