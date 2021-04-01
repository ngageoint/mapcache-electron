import FileUtilities from '../util/FileUtilities'

export default class Source {
  constructor (filePath, directory, layers = [], sourceName, format = 'image/png') {
    const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory(directory)
    this.sourceId = sourceId
    this.directory = directory
    this.sourceDirectory = sourceDirectory
    this.filePath = filePath
    this.layers = layers
    this.sourceName = sourceName
    this.format = format
  }

  removeSourceDir () {
    FileUtilities.rmDir(this.sourceDirectory)
  }

  get sourceCacheFolder () {
    return this.sourceDirectory
  }

  /**
   * Returns a directory and id for a source layer
   * @returns {{layerDirectory: string, layerId: *}}
   */
  createLayerDirectory () {
    const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory(this.directory)
    return { layerId: sourceId, layerDirectory: sourceDirectory}
  }

  /**
   * Standard cleanup is to remove the source directory created
   */
  cleanUp () {
    this.removeSourceDir()
  }
}
