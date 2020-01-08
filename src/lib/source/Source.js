import { userDataDir } from '../settings/Settings'
import UniqueIDUtilities from '../UniqueIDUtilities'

export default class Source {
  constructor (filePath, layers = [], credentials = {}, sourceId = UniqueIDUtilities.createUniqueID()) {
    this.sourceId = sourceId
    this.filePath = filePath
    this.layers = layers
    this.credentials = credentials
  }

  get sourceCacheFolder () {
    return userDataDir().dir(this.sourceId)
  }

  async initialize () {
    throw new Error('Abstract method must be implemented in subclass')
  }
}
