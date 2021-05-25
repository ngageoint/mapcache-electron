const { parentPort } = require('worker_threads')
import { CanvasKitCanvasAdapter } from '@ngageoint/geopackage'
import CanvasUtilities from '../util/CanvasUtilities'
import GeoTiffRenderingUtilities from '../util/GeoTiffRenderingUtilities'
import MBTilesRenderingUtilities from '../util/MBTilesRenderingUtilities'
import GeoPackageRenderingUtilities from '../util/GeoPackageRenderingUtilities'
import LayerTypes from '../source/layer/LayerTypes'

/**
 * Attaches media to a geopackage
 * @param data
 * @returns {Promise<any>}
 */
async function attachMedia (data) {
  const GeoPackageMediaUtilities = require('../geopackage/GeoPackageMediaUtilities').default
  return GeoPackageMediaUtilities.addMediaAttachment(data.geopackagePath, data.tableName, data.featureId, data.filePath)
}

/**
 * This function takes a source configuration and returns any data source layers necessary
 * @param data
 * @returns {Promise<{dataSources: Array}>}
 */
async function processDataSource (data) {
  const SourceFactory = require('../source/SourceFactory').default
  let source = data.source
  let dataSources = []
  let error = null
  try {
    let createdSource = await SourceFactory.constructSource(source)
    if (createdSource != null) {
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
  if (error != null) {
    throw error
  }
  return {
    dataSources: dataSources
  }
}

/**
 * This function handles a render tile request for GeoTIFF, GeoPackage (Vector + Raster) and MBTiles (Vector + Raster)
 * @param data
 * @returns {Promise<unknown>}
 */
async function renderTile (data) {
  return new Promise((resolve, reject) => {
    switch (data.layerType) {
      case LayerTypes.GEOTIFF:
        GeoTiffRenderingUtilities.requestTile(data).then((result) => {
          resolve(result)
        }).catch(error => {
          reject(error)
        })
        break;
      case LayerTypes.MBTILES:
        MBTilesRenderingUtilities.requestTile(data).then((result) => {
          resolve(result)
        }).catch(error => {
          reject(error)
        })
        break;
      case LayerTypes.VECTOR:
        GeoPackageRenderingUtilities.requestVectorTile(data).then((result) => {
          resolve(result)
        }).catch(error => {
          reject(error)
        })
        break;
      case LayerTypes.GEOPACKAGE:
        GeoPackageRenderingUtilities.requestImageryTile(data).then((result) => {
          resolve(result)
        }).catch(error => {
          reject(error)
        })
        break;
      default:
        reject(new Error(data.layerType + ' not a supported layer type'))
    }
  });
}

/**
 * Handles incoming requests from the parent port
 */
function setupRequestListener () {
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
    } else if (message.type === 'render_tile') {
      renderTile(message.data).then((result) => {
        parentPort.postMessage(result)
      }).catch(error => {
        throw error
      })
    }
  })
}

/**
 * Starts up the thread
 */
function startThread () {
  const path = require('path')
  const CanvasKitInit = require('@ngageoint/geopackage/dist/canvaskit/canvaskit.js')
  CanvasKitInit({
    locateFile: (file) => process.env.NODE_ENV === 'production' ? path.join(path.dirname(__dirname), 'canvaskit', file) : path.join(path.dirname(__dirname), 'node_modules', '@ngageoint/geopackage', 'dist', 'canvaskit', file)
  }).then((CanvasKit) => {
    CanvasKitCanvasAdapter.setCanvasKit(CanvasKit)
    CanvasUtilities.setCreateCanvasFunction((width, height) => {
      return CanvasKit.MakeCanvas(width, height)
    })
    CanvasUtilities.setMakeImageDataFunction((width, height) => {
      return new CanvasKit.ImageData(width, height)
    })
    setupRequestListener()
    parentPort.postMessage({ready: true})
  })
}

function printMemUsage () {
  setTimeout(() => {
    const memory = process.memoryUsage()
    console.log('MapCache Thread: ' + (memory.heapUsed / 1024.0 / 1024.0) + ' of ' + (memory.heapTotal / 1024.0 / 1024.0) + ' MB used, rss: ' + (memory.rss / 1024.0 / 1024.0) + ' MB, external: ' + (memory.external / 1024.0 / 1024.0) + ' MB');
    printMemUsage()
  }, 5000)
}

printMemUsage()


/**
 * Start thread, if error, notify parent process
 */
try {
  startThread()
} catch (e) {
  parentPort.postMessage({ready: false, error: e})
}


