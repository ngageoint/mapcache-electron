import path from 'path'
import { clipboard, ipcRenderer } from 'electron'
import FileUtilities from '../util/FileUtilities'
import log from 'electron-log'
import GeoPackageMediaUtilities from '../geopackage/GeoPackageMediaUtilities'
import MediaUtilities from '../util/MediaUtilities'
import jetpack from 'fs-jetpack'
import { Context, HtmlCanvasAdapter, SqliteAdapter } from '@ngageoint/geopackage'
import ProjectActions from "@/lib/vuex/ProjectActions";

Object.assign(console, log.functions)

window.mapcache = {
  setupGeoPackgeContext: () => {
    Context.setupCustomContext(SqliteAdapter, HtmlCanvasAdapter)
  },
  getUserDataDirectory: () => {
    return ipcRenderer.sendSync('get-user-data-directory')
  },
  getAppDataDirectory: () => {
    return ipcRenderer.sendSync('get-app-data-directory')
  },
  showOpenDialog: (options) => {
    return new Promise (resolve => {
      ipcRenderer.once('show-open-dialog-completed', (event, result) => {
        resolve(result)
      })
      ipcRenderer.send('show-open-dialog', options)
    })
  },
  showSaveDialog: (options) => {
    return new Promise (resolve => {
      ipcRenderer.once('show-save-dialog-completed', (event, result) => {
        resolve(result)
      })
      ipcRenderer.send('show-save-dialog', options)
    })
  },
  copyToClipboard: (text) => {
    clipboard.writeText(text)
  },
  getOfflineMap: () => {
    return FileUtilities.readJSONFile(path.join(FileUtilities.getExtraResourcesDirectory(), 'offline.json'))
  },
  createBaseMapDirectory: () => {
    return FileUtilities.createNextAvailableBaseMapDirectory(window.mapcache.getUserDataDirectory())
  },
  createSourceDirectory: (projectDirectory) => {
    return FileUtilities.createNextAvailableSourceDirectory(projectDirectory)
  },
  closeProject: () => {
    ipcRenderer.send('close-project')
  },
  cancelProcessingSource: (source, callback) => {
    ipcRenderer.removeAllListeners('process_source_completed_' + source.id)
    ipcRenderer.once('cancel_process_source_completed_' + source.id, callback)
    ipcRenderer.send('cancel_process_source', source)
  },
  attachMediaToGeoPackage: (data, callback) => {
    ipcRenderer.once('attach_media_completed_' + data.id, (event, success) => {
      callback(success)
    })
    ipcRenderer.send('attach_media', data)
  },
  removeMediaCompletedListener: (id) => {
    ipcRenderer.removeAllListeners('attach_media_completed_' + id)
  },
  downloadAttachment: async (filePath, geopackagePath, relatedTable, relatedId) => {
    const mediaRow = await GeoPackageMediaUtilities.getMediaRow(geopackagePath, relatedTable, relatedId)
    const extension = MediaUtilities.getExtension(mediaRow.contentType)
    let file = filePath
    if (extension !== false) {
      file = filePath + '.' + extension
    }
    await jetpack.writeAsync(file, mediaRow.data)
  },
  sendClientCredentials: (credentials) => {
    ipcRenderer.send('client-credentials-input', credentials)
  },
  sendCertificateSelection: (certificate) => {
    ipcRenderer.send('client-certificate-selected', certificate)
  },
  removeClosingProjectWindowListener: () => {
    ipcRenderer.removeAllListeners('closing-project-window')
  },
  removeSelectClientCertificateListener: () => {
    ipcRenderer.removeAllListeners('select-client-certificate')
  },
  removeRequestClientCredentialsListener: () => {
    ipcRenderer.removeAllListeners('request-client-credentials')
  },
  addClosingProjectWindowListener: (callback) => {
    ipcRenderer.on('closing-project-window', (event, args) => {
      callback(args)
    })
  },
  addSelectClientCertificateListener: (callback) => {
    ipcRenderer.on('select-client-certificate', (event, args) => {
      callback(args)
    })
  },
  addRequestClientCredentialsListener: (callback) => {
    ipcRenderer.on('request-client-credentials', (event, args) => {
      callback(args)
    })
  },
  processSource: (data) => {
    ipcRenderer.send('process_source', data)
  },
  onceProcessSourceCompleted: (id, callback) => {
    ipcRenderer.once('process_source_completed_' + id, (event, result) => {
      callback(result)
    })
  },
  addFeatureLayer: (configuration, statusCallback, callback) => {
    ipcRenderer.once('build_feature_layer_completed_' + configuration.id, () => {
      ipcRenderer.removeAllListeners('build_feature_layer_status_' + configuration.id)
      callback()
    })
    ipcRenderer.on('build_feature_layer_status_' + configuration.id, (event, status) => {
      statusCallback(status)
    })
    ipcRenderer.send('build_feature_layer', {configuration: configuration})
  },
  cancelAddFeatureLayer: (configuration, callback) => {
    ipcRenderer.removeAllListeners('build_feature_layer_status_' + configuration.id)
    ipcRenderer.removeAllListeners('build_feature_layer_completed_' + configuration.id)
    ipcRenderer.once('cancel_build_feature_layer_completed_' + configuration.id, () => {
      callback()
    })
    ipcRenderer.send('cancel_build_feature_layer', {configuration: configuration})
  },
  addTileLayer: (configuration, statusCallback, callback) => {
    ipcRenderer.once('build_tile_layer_completed_' + configuration.id, () => {
      ipcRenderer.removeAllListeners('build_tile_layer_status_' + configuration.id)
      callback()
    })
    ipcRenderer.on('build_tile_layer_status_' + configuration.id, (event, status) => {
      statusCallback(status)
    })
    ipcRenderer.send('build_tile_layer', {configuration: configuration})
  },
  cancelAddTileLayer: (configuration, callback) => {
    ipcRenderer.removeAllListeners('build_tile_layer_status_' + configuration.id)
    ipcRenderer.removeAllListeners('build_tile_layer_completed_' + configuration.id)
    ipcRenderer.once('cancel_build_tile_layer_completed_' + configuration.id, () => {
      callback()
    })
    ipcRenderer.send('cancel_build_tile_layer', {configuration: configuration})
  }
}
