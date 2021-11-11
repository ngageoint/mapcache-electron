import { createUniqueID } from '../util/UniqueIDUtilities'
import { createNextAvailableLayerDirectory } from '../util/file/FileUtilities'

/**
 * A Source is a representation of a file or url (denoted in the filePath variable). The result of processing a source is
 * a collection of layers that have the information required to setup renderers.
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
  createLayerDirectory (id = createUniqueID()) {
    return { layerId: id, layerDirectory: createNextAvailableLayerDirectory(this.directory)}
  }

  /**
   * Retrieves a list of Layer objects
   * @param statusCallback
   */
  // eslint-disable-next-line no-unused-vars
  retrieveLayers (statusCallback) {
    throw new Error('Subclass must define the retrieveLayers function')
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
