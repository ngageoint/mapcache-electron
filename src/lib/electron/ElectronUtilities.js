export default class ElectronUtilities {
  static appDataDirectory () {
    return window.mapcache.getUserDataDirectory()
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
}
