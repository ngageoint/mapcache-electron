import { userDataDir } from '../settings/Settings'

export default class Source {
  constructor (filePath, layers = [], credentials = {}, sourceId = Source.createId()) {
    this.sourceId = sourceId
    this.filePath = filePath
    this.layers = layers
    this.credentials = credentials
  }

  get sourceCacheFolder () {
    return userDataDir().dir(this.sourceId)
  }

  get mapLayer () {
    throw new Error('Abstract method must be implemented in subclass')
  }

  async initialize () {
    throw new Error('Abstract method must be implemented in subclass')
  }

  static createId () {
    function s4 () {
      return new Date().getTime()
        .toString(16)
        .substring(1)
    }
    return s4()
  }
}
