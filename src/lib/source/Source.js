import { userDataDir } from '../settings/Settings'

export default class Source {
  constructor (filePath, sourceId = createId()) {
    this.sourceId = sourceId
    this.filePath = filePath
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
}

function createId () {
  function s4 () {
    return new Date().getTime()
      .toString(16)
      .substring(1)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}
