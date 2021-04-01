const { parentPort } = require('worker_threads')
import GeoPackageMediaUtilities from '../lib/geopackage/GeoPackageMediaUtilities'
import SourceFactory from '../lib/source/SourceFactory'
import isNil from 'lodash/isNil'

let setup = false

/**
 * Attaches media to a geopackage
 * @param data
 * @returns {Promise<any>}
 */
function attachMedia (data) {
  return GeoPackageMediaUtilities.addMediaAttachment(data.geopackagePath, data.tableName, data.featureId, data.filePath)
}

/**
 * This function takes a source configuration and returns any data source layers necessary
 * @param data
 * @returns {Promise<{source: *, error: null, dataSources: Array}>}
 */
async function processDataSource (data) {
  let source = data.source
  let dataSources = []
  let error = null
  try {
    let createdSource = await SourceFactory.constructSource(source)
    if (!isNil(createdSource)) {
      let layers = await createdSource.retrieveLayers().catch(err => {
        throw err
      })
      for (let i = 0; i < layers.length; i++) {
        try {
          let layer = layers[i]
          await layer.initialize()
          dataSources.push({id: layer.id, config: layer.configuration})
          layer.close()
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('unable to initialize data source: ' + layers[i].sourceLayerName)
          // eslint-disable-next-line no-console
          console.error(error)
        }
      }
      createdSource.cleanUp()
    } else {
      error = 'Unable to create data source.'
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e)
    error = e
  }
  return {
    dataSources: dataSources,
    source: source,
    error: error
  }
}


parentPort.on('message', (message) => {
  if (message.shutdown) {
    closeListeners()
    process.exit()
  } else if (message.type === 'attach_media') {
    attachMedia(message.data).then((result) => {
      parentPort.postMessage(result)
    }).catch(error => {
      throw error
    })
  } else if (message.type === 'process_source') {
    processDataSource(message.data).then((result) => {
      parentPort.postMessage(result)
    }).catch(error => {
      parentPort.postMessage({error: error, source: message.data.source, dataSources: []})
    })
  }
})

function closeListeners () {
  process.off('SIGINT')
  process.off('SIGTERM')
  process.off('SIGABRT')
  process.off('SIGSEGV')
  parentPort.off('message')
}

function setupListeners () {
  process.on('SIGINT', () => {
    closeListeners()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    closeListeners()
    process.exit(0)
  })

  process.on('SIGABRT', () => {
    closeListeners()
    process.exit(0)
  })

  process.on('SIGSEGV', () => {
    closeListeners()
    process.exit(0)
  })

  setup = true
}

if (!setup) {
  setupListeners()
}
