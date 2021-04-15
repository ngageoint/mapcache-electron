const { parentPort } = require('worker_threads')
import GeoPackageMediaUtilities from '../geopackage/GeoPackageMediaUtilities'
import SourceFactory from '../source/SourceFactory'
import isNil from 'lodash/isNil'

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
 * @returns {Promise<{dataSources: Array}>}
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
      if (layers.length > 0) {
        for (let i = 0; i < layers.length; i++) {
          try {
            let layer = layers[i]
            await layer.initialize()
            dataSources.push({id: layer.id, config: layer.configuration})
            layer.close()
            // eslint-disable-next-line no-unused-vars
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to initialize data source: ' + layers[i].sourceLayerName)
            error = err
          }
        }
      } else {
        error = new Error('No data source layers retrieved.')
      }
    } else {
      error = new Error('Failed to create data source.')
    }
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to process data source.')
    error = e
  }
  if (!isNil(error)) {
    throw error
  }
  return {
    dataSources: dataSources
  }
}

parentPort.on('message', (message) => {
  if (message.type === 'attach_media') {
    attachMedia(message.data).then((result) => {
      parentPort.postMessage(result)
    }).catch(error => {
      throw error
    })
  } else if (message.type === 'process_source') {
    processDataSource(message.data).then((result) => {
      parentPort.postMessage(result)
    }).catch(error => {
      throw error
    })
  }
})
