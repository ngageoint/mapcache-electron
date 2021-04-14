import path from 'path'
import FileUtilities from '../util/FileUtilities'

export default class ElectronUtilities {

  static userDataDirectory () {
    return window.mapcache.getUserDataDirectory()
  }

  static appDataDirectory () {
    return window.mapcache.getAppDataDirectory()
  }

  static sourcesDirectory (projectId) {
    return path.join(ElectronUtilities.projectDirectory(projectId), FileUtilities.SOURCE_DIRECTORY_IDENTIFIER)
  }

  static sourceDirectory (projectId, sourceId) {
    return path.join(ElectronUtilities.sourcesDirectory(projectId), sourceId)
  }

  static createSourceDirectory (projectId, sourceId) {
    const directory = ElectronUtilities.sourceDirectory(projectId, sourceId)
    FileUtilities.createDirectory(directory)
    return directory
  }

  static baseMapDirectory (baseMapId) {
    return path.join(ElectronUtilities.userDataDirectory(), FileUtilities.BASEMAP_DIRECTORY_IDENTIFIER, baseMapId)
  }

  static createBaseMapDirectory (baseMapId) {
    const directory = ElectronUtilities.baseMapDirectory(baseMapId)
    FileUtilities.createDirectory(directory)
    return directory
  }

  static projectDirectory (projectId) {
    return path.join(ElectronUtilities.userDataDirectory(), FileUtilities.PROJECT_DIRECTORY_IDENTIFIER, projectId)
  }

  static createProjectDirectory (projectId) {
    const directory = ElectronUtilities.projectDirectory(projectId)
    FileUtilities.createDirectory(directory)
    // create sources
    FileUtilities.createDirectory(ElectronUtilities.sourcesDirectory(projectId))
    return directory
  }

  static openExternal (link) {
    window.mapcache.openExternal(link)
  }

  static async showOpenDialog (options) {
    return window.mapcache.showOpenDialog(options)
  }

  static async showSaveDialog (options) {
    return window.mapcache.showSaveDialog(options)
  }

  static getOfflineMap () {
    return FileUtilities.readJSONFile(path.join(FileUtilities.getExtraResourcesDirectory(), 'offline.json'))
  }
}
