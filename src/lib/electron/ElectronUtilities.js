import path from 'path'
import FileUtilities from '../util/FileUtilities'

export default class ElectronUtilities {

  static userDataDirectory () {
    return window.mapcache.getUserDataDirectory()
  }

  static appDataDirectory () {
    return window.mapcache.getAppDataDirectory()
  }

  static createLayerDirectory (sourceDirectory) {
    return FileUtilities.createNextAvailableLayerDirectory(sourceDirectory)
  }

  static createSourceDirectory (projectDirectory) {
    return FileUtilities.createNextAvailableSourceDirectory(projectDirectory)
  }

  static createBaseMapDirectory () {
    return FileUtilities.createNextAvailableBaseMapDirectory(ElectronUtilities.userDataDirectory())
  }

  static createProjectDirectory () {
    return FileUtilities.createNextAvailableProjectDirectory(ElectronUtilities.userDataDirectory())
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
