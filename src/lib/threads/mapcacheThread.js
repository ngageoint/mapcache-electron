import { parentPort } from 'worker_threads'
import { CanvasKitCanvasAdapter, FeatureTiles, GeoPackageAPI, NumberFeaturesTile } from '@ngageoint/geopackage'
import {
  createCanvas,
  makeImageData,
  setCreateCanvasFunction,
  setMakeImageDataFunction,
  disposeCanvas,
  setMakeImageFunction,
  setReadPixelsFunction
} from '../util/canvas/CanvasUtilities'
import { requestTile as requestGeoTIFFTile } from '../util/rendering/GeoTiffRenderingUtilities'
import { requestTile as requestMBTilesTile } from '../util/rendering/MBTilesRenderingUtilities'
import { requestTile as requestXYZFileTile} from '../util/rendering/XYZFileRenderingUtilities'
import { GEOTIFF, GEOPACKAGE, MBTILES, XYZ_FILE, VECTOR } from '../layer/LayerTypes'
import { REQUEST_ATTACH_MEDIA, REQUEST_PROCESS_SOURCE, REQUEST_RENDER, REQUEST_GEOTIFF_RASTER, REQUEST_TILE_REPROJECTION } from './mapcacheThreadRequestTypes'
import path from 'path'
import { reproject } from '../projection/ReprojectionUtilities'
import { base64toUInt8Array } from '../util/Base64Utilities'

/**
 * ExpiringGeoPackageConnection will expire after a period of inactivity of specified
 */
class ExpiringGeoPackageConnection {
  geoPackageConnection
  featureTiles = {}
  filePath
  expiryMs
  expiryId = null
  styleKey = 0

  constructor(filePath, expiryMs = 5000) {
    this.filePath = filePath
    this.expiryMs = expiryMs
  }

  expire () {
    if (this.geoPackageConnection != null) {
      try {
        this.geoPackageConnection.close()
        Object.values(this.featureTiles).forEach(featureTile => {
          try {
            featureTile.cleanup()
            // eslint-disable-next-line no-empty
          } catch (e) {}
        })
        this.featureTiles = {}
        // eslint-disable-next-line no-empty
      } catch (e) {
      } finally {
        this.geoPackageConnection = null
        this.expiryId = null
      }
    }
  }

  startExpiry () {
    this.expiryId = setTimeout(() => {
      this.expire()
    }, this.expiryMs)
  }

  cancelExpiry () {
    if (this.expiryId != null) {
      clearTimeout(this.expiryId)
      this.expiryId = null
    }
  }

  async accessConnection () {
    this.cancelExpiry()
    if (this.geoPackageConnection == null) {
      this.geoPackageConnection = await GeoPackageAPI.open(this.filePath)
    }
    return this.geoPackageConnection
  }

  async accessFeatureTiles (tableName, maxFeatures) {
    if (this.featureTiles[tableName] == null) {
      const geoPackageConnection = await this.accessConnection()
      this.featureTiles[tableName] = new FeatureTiles(geoPackageConnection.getFeatureDao(tableName), 256, 256)
      this.featureTiles[tableName].maxFeaturesPerTile = maxFeatures
      this.featureTiles[tableName].simplifyTolerance = 1.0
      this.featureTiles[tableName].maxFeaturesTileDraw = new NumberFeaturesTile()
    } else {
      this.featureTiles[tableName].maxFeaturesPerTile = maxFeatures
      this.cancelExpiry()
    }
    return this.featureTiles[tableName]
  }

  finished () {
    this.startExpiry()
  }
}

// cache geopackage connections
const cachedGeoPackageConnections = {}
// track style changes, anytime the style changes, the cached connection will need to be reset
const styleKeyMap = {}


/**
 * Sets up an expiring geopackage connection wrapper.
 * @param filePath
 * @returns {*}
 */
function getExpiringGeoPackageConnection (filePath) {
  if (cachedGeoPackageConnections[filePath] == null) {
    cachedGeoPackageConnections[filePath] = new ExpiringGeoPackageConnection(filePath, 5000)
  }
  return cachedGeoPackageConnections[filePath]
}

/**
 * Attaches media to a geopackage
 * @param data
 * @returns {Promise<any>}
 */
async function attachMedia (data) {
  const { addMediaAttachment, addMediaAttachmentFromUrl } = require('../geopackage/GeoPackageMediaUtilities')
  if (data.filePath != null) {
    return addMediaAttachment(data.geopackagePath, data.tableName, data.featureId, data.filePath)
  } else if (data.url != null) {
    return addMediaAttachmentFromUrl(data.geopackagePath, data.tableName, data.featureId, data.url)
  }
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
  const statusCallback = (message, completionPercentage) => {
    parentPort.postMessage({type: 'status', message, completionPercentage })
  }
  try {
    let createdSource = await SourceFactory.constructSource(source)
    if (createdSource != null) {
      let layers = await createdSource.retrieveLayers(statusCallback)
      if (layers.length > 0) {
        for (let i = 0; i < layers.length; i++) {
          try {
            let layer = layers[i]
            dataSources.push({id: layer.id, config: layer.configuration})
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
 * Requests a geopackage vector tile
 * @param data
 * @param resolve
 * @param reject
 * @returns {Promise<void>}
 */
async function requestGeoPackageVectorTile (data, resolve, reject) {
  const expiringGeoPackage = getExpiringGeoPackageConnection(data.dbFile)
  // add style key map entry
  if (styleKeyMap[data.dbFile] == null) {
    styleKeyMap[data.dbFile] = {}
  }
  // if style key for table does not match style key from request, it means the style has changed and the connection needs to be reset
  if (styleKeyMap[data.dbFile][data.tableName] !== data.styleKey) {
    styleKeyMap[data.dbFile][data.tableName] = data.styleKey
    expiringGeoPackage.expire()
  }
  const featureTile = await expiringGeoPackage.accessFeatureTiles(data.tableName, data.maxFeatures)
  const {x, y, z} = data.coords
  featureTile.drawTile(x, y, z).then((result) => {
    resolve(result)
  }).catch(error => {
    console.error('Failed to render tile.')
    reject(error)
  }).finally(() => {
    expiringGeoPackage.finished()
  })
}

/**
 * Requests a geo package tile table tile
 * @param data
 * @param resolve
 * @param reject
 * @returns {Promise<void>}
 */
async function requestGeoPackageTile (data, resolve, reject) {
  const expiringGeoPackage = getExpiringGeoPackageConnection(data.dbFile)
  const connection = await expiringGeoPackage.accessConnection()
  const {x, y, z} = data.coords
  connection.xyzTile(data.tableName, x, y, z, 256, 256).then((result) => {
    resolve(result)
  }).catch(error => {
    console.error('Failed to render tile.')
    reject(error)
  }).finally(() => {
    expiringGeoPackage.finished()
  })
}

/**
 * This function handles a render tile request for GeoTIFF, GeoPackage (Vector + Raster) and MBTiles (Vector + Raster)
 * @param data
 * @returns {Promise<unknown>}
 */
async function renderTile (data) {
  return new Promise((resolve, reject) => {
    switch (data.layerType) {
      case GEOTIFF:
        requestGeoTIFFTile(data).then((result) => {
          resolve(result)
        }).catch(error => {
          reject(error)
        })
        break
      case MBTILES:
        requestMBTilesTile(data).then((result) => {
          resolve(result)
        }).catch(error => {
          reject(error)
        })
        break
      case VECTOR:
        requestGeoPackageVectorTile(data, resolve, reject)
        break
      case XYZ_FILE:
        requestXYZFileTile(data).then((result) => {
          resolve(result)
        }).catch(error => {
          reject(error)
        })
        break
      case GEOPACKAGE:
        requestGeoPackageTile(data, resolve, reject)
        break
      default:
        reject(new Error(data.layerType + ' not a supported layer type'))
    }
  })
}


/**
 * Generates and returns the absolute path to a geotiff raster data file
 * @param data
 * @returns {Promise<string>}
 */
async function generateGeoTIFFRasterFile (data) {
  const { filePath } = data
  const GeoTIFFSource = require('../source/geotiff/GeoTIFFSource').default
  const geotiff = await GeoTIFFSource.getGeoTIFF(filePath)
  const image = await GeoTIFFSource.getImage(geotiff)
  const rasterFile = path.join(path.dirname(filePath), 'data.bin')
  await GeoTIFFSource.createGeoTIFFDataFile(image, rasterFile)
  return rasterFile
}

/**
 * Handles a reprojection request
 * @param data
 * @returns {ArrayBufferLike}
 */
async function reprojectTile (data) {
  const { targetWidth, targetHeight } = data
  const canvas = createCanvas(targetWidth, targetHeight)
  const imageData = makeImageData(targetWidth, targetHeight)
  await reproject(data, imageData)
  canvas.getContext('2d').putImageData(imageData, 0, 0)
  const result = canvas.toDataURL()
  disposeCanvas(canvas)
  return result
}

/**
 * Handles incoming requests from the parent port
 */
function setupRequestListener () {
  parentPort.on('message', (message) => {
    if (message.type === REQUEST_ATTACH_MEDIA) {
      attachMedia(message.data).then((result) => {
        parentPort.postMessage({error: null, result: result})
      }).catch(() => {
        parentPort.postMessage({error: 'Failed to attach media.', result: null})
      })
    } else if (message.type === REQUEST_PROCESS_SOURCE) {
      processDataSource(message.data).then((result) => {
        parentPort.postMessage({error: null, result: result})
      }).catch(() => {
        parentPort.postMessage({error: 'Failed to process data source.', result: null})
      })
    } else if (message.type === REQUEST_RENDER) {
      renderTile(message.data).then((result) => {
        parentPort.postMessage({error: null, result: result})
      }).catch(() => {
        parentPort.postMessage({error: 'Failed to render tile.', result: null})
      })
    } else if (message.type === REQUEST_GEOTIFF_RASTER) {
      generateGeoTIFFRasterFile(message.data).then((result) => {
        parentPort.postMessage({error: null, result: result})
      }).catch(() => {
        parentPort.postMessage({error: 'Failed to generate raster file.', result: null})
      })
    } else if (message.type === REQUEST_TILE_REPROJECTION) {
      reprojectTile(message.data).then(result => {
        parentPort.postMessage({error: null, result: result})
      }).catch(() => {
        parentPort.postMessage({error: 'Failed to project tile.', result: null})
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
    locateFile: (file) => process.env.NODE_ENV === 'production' ? path.join(path.dirname(__dirname), 'canvaskit', file) : path.join(path.dirname(__dirname), 'node_modules', '@ngageoint', 'geopackage', 'dist', 'canvaskit', file)
  }).then((CanvasKit) => {
    CanvasKitCanvasAdapter.setCanvasKit(CanvasKit)
    setCreateCanvasFunction((width, height) => {
      return CanvasKit.MakeCanvas(width, height)
    })
    setMakeImageDataFunction((width, height) => {
      return new CanvasKit.ImageData(width, height)
    })
    setReadPixelsFunction (image => {
      return image.readPixels(0, 0, {
        width: image.width(),
        height: image.height(),
        colorType: CanvasKit.ColorType.RGBA_8888,
        alphaType: CanvasKit.AlphaType.Unpremul,
        colorSpace: CanvasKit.ColorSpace.SRGB
      })
    })
    setMakeImageFunction(base64String => {
      return Promise.resolve(CanvasKit.MakeImageFromEncoded(base64toUInt8Array(base64String)))
    })
    setupRequestListener()
    parentPort.postMessage({error: null})
  })
}

/**
 * Start thread, if error, notify parent process
 */
try {
  startThread()
} catch (e) {
  parentPort.postMessage({error: e})
}


