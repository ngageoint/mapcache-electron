import UniqueIDUtilities from '../util/UniqueIDUtilities'
import FileUtilities from '../util/FileUtilities'

/**
 * A Source is a representation of a file or url (denoted in the filePath variable)
 */
export default class Source {
  /**
   * Constructor
   * @param id - source id (uuid v4 string)
   * @param directory - source directory (should be in the project's sources directory and be named using the source's id value)
   * @param filePath - path to the file, directory, or url where the data can be found
   */
  constructor (id, directory, filePath) {
    this.sourceId = id
    this.directory = directory
    this.filePath = filePath
  }

  /**
   * Returns a directory and id for a source layer
   * @returns {{layerDirectory: string, layerId: *}}
   */
  createLayerDirectory (id = UniqueIDUtilities.createUniqueID()) {
    const { sourceId, sourceDirectory } = FileUtilities.createSourceDirectory(this.directory, id)
    return { layerId: sourceId, layerDirectory: sourceDirectory}
  }

  /**
   * Retrieves a list of Layer objects
   */
  retrieveLayers () {
    throw new Error('Subclass must define the retrieveLayers function')
  }
}
