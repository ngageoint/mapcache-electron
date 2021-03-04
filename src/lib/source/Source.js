import FileUtilities from '../FileUtilities'

export default class Source {
  constructor (filePath, layers = [], sourceName, format = 'image/png') {
    const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory()
    this.sourceId = sourceId
    this.sourceDirectory = sourceDirectory
    this.filePath = filePath
    this.layers = layers
    this.sourceName = sourceName
    this.format = format
  }

  removeSourceDir () {
    FileUtilities.rmSourceDirectory(this.sourceId)
  }

  get sourceCacheFolder () {
    return this.sourceDirectory
  }

  async initialize () {
    throw new Error('Abstract method must be implemented in subclass')
  }
}
