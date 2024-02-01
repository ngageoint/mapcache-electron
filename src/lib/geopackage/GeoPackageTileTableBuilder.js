import { BoundingBox, TileScaling, TileScalingType } from '@ngageoint/geopackage'
import isNil from 'lodash/isNil'
import throttle from 'lodash/throttle'
import sharp from 'sharp'
import {
  performSafeGeoPackageOperation,
  prettyPrintMs,
  deleteGeoPackageTable
} from './GeoPackageCommon'
import { constructLayer } from '../layer/LayerFactory'
import { trimExtentToWebMercatorMax } from '../util/xyz/XYZTileUtilities'
import {
  createCanvas,
  isBlank,
  hasTransparentPixels,
  disposeCanvas,
  makeImage,
  disposeImage
} from '../util/canvas/CanvasUtilities'
import { wgs84ToWebMercator } from '../projection/ProjectionUtilities'
import { constructRenderer } from '../leaflet/map/renderer/RendererFactory'
import {
  extentIntersection,
  getExpandedExtentForDrawOverlap,
  getTileMatrix,
  getZoomTileMatrixCount,
  iterateTilesInMatrix,
  trimExtentToFilter
} from '../util/tile/TileUtilities'
import { createUniqueID } from '../util/UniqueIDUtilities'
import {
  COLON_DELIMITER, EPSG,
  WEB_MERCATOR,
  WEB_MERCATOR_CODE,
  WORLD_GEODETIC_SYSTEM_CODE
} from '../projection/ProjectionConstants'
import { getWGS84BoundingBoxFromXYZ, trimExtentToWGS84Max } from '../util/xyz/WGS84XYZTileUtilities'
import { getWebMercatorBoundingBoxFromXYZ, tileIntersects, tileIntersectsXYZ } from '../util/tile/TileBoundingBoxUtils'
import SlowServerNotifier from './SlowServerNotifier'
import { convertPbfToDataUrl } from '../util/rendering/MBTilesUtilities'
import { ipcRenderer } from 'electron'
import { getWGS84ExtentFromXYZ } from '../util/xyz/WGS84XYZTileUtilities'
import { reprojectBoundingBox, convertToWebMercator } from '../projection/ProjectionUtilities'
import { sleep } from '../util/common/CommonUtilities'
/**
 * GeoPackgeTileTableBuilder handles building a tile layer given a user defined configuration
 * Note: this file only runs within an electron browser window (specifically, the worker window)
 */

async function getImageBufferFromCanvas (canvas) {
  if (!isBlank(canvas)) {
    if (hasTransparentPixels(canvas)) {
      try {
        return sharp(Buffer.from(canvas.toDataURL().split(',')[1], 'base64'))
          .png()
          .toBuffer()
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to add tile')
      }
    } else {
      return Buffer.from(canvas.toDataURL('image/jpeg', { quality: 0.7 }).split(',')[1], 'base64')
    }
  }
  return null
}


/**
 * Builds a tile layer
 * @param configuration
 * @param statusCallback
 * @returns {Promise<any>}
 */
async function buildTileLayer (configuration, statusCallback) {
  global.ipcRenderer = ipcRenderer
  global.convertPbfToDataUrl = convertPbfToDataUrl
  global.tileIntersects = tileIntersects
  global.wgs84ToWebMercator = wgs84ToWebMercator
  global.getWGS84ExtentFromXYZ = getWGS84ExtentFromXYZ
  global.createUniqueID = createUniqueID
  global.getWebMercatorBoundingBoxFromXYZ = getWebMercatorBoundingBoxFromXYZ
  global.tileIntersectsXYZ = tileIntersectsXYZ
  global.reprojectBoundingBox = reprojectBoundingBox
  global.convertToWebMercator = convertToWebMercator

  return performSafeGeoPackageOperation(configuration.path, async (gp) => {
    const buildStart = new Date().getTime()

    const size = configuration.size

    const status = {
      message: 'Starting...',
      progress: 0.0
    }

    try {
      const throttleStatusCallback = throttle(statusCallback, 250)

      const tableName = configuration.table
      const projection = configuration.targetProjection || WEB_MERCATOR
      const isWebMercator = projection.endsWith(COLON_DELIMITER + WEB_MERCATOR_CODE)

      throttleStatusCallback(status)

      await sleep(1000)

      let minZoom = configuration.minZoom
      let maxZoom = configuration.maxZoom

      status.message = 'Preparing layers...'

      throttleStatusCallback(status)

      let layersPrepared = 0
      const numberOfLayers = configuration.sourceLayers.length + configuration.geopackageLayers.length
      let layers = []

      for (let i = 0; i < configuration.sourceLayers.length; i++) {
        const sourceLayer = configuration.sourceLayers[i]
        const layer = constructLayer(sourceLayer)
        layer.setRenderer(constructRenderer(layer, true))
        layers.push(layer)
        layersPrepared++
        status.progress = 20.0 * layersPrepared / numberOfLayers
        throttleStatusCallback(status)
      }

      // construct vector/tile data source layers for the geopackage layers
      for (let i = 0; i < configuration.geopackageLayers.length; i++) {
        const geopackageLayer = configuration.geopackageLayers[i]
        const geopackage = geopackageLayer.geopackage
        const tableName = geopackageLayer.table
        const type = geopackageLayer.type
        let layer
        if (type === 'feature') {
          layer = constructLayer({
            id: geopackage.id + '_' + tableName,
            geopackageFilePath: geopackage.path,
            sourceDirectory: geopackage.path,
            sourceLayerName: tableName,
            sourceType: 'GeoPackage',
            layerType: 'Vector',
            drawOverlap: geopackageLayer.drawOverlap,
            count: geopackage.tables.features[tableName].featureCount,
            extent: geopackage.tables.features[tableName].extent,
          })
          layer.setRenderer(constructRenderer(layer, true))
        } else {
          layer = constructLayer({
            id: geopackage.id + '_' + tableName,
            filePath: geopackage.path,
            sourceLayerName: tableName,
            layerType: 'GeoPackage',
            extent: geopackage.tables.tiles[tableName].extent
          })
          layer.setRenderer(constructRenderer(layer, true))
        }

        layers.push(layer)
        layersPrepared++
        status.progress = 20.0 * layersPrepared / numberOfLayers
        throttleStatusCallback(status)
      }

      // sort layers into rendering order
      let sortedLayers = []
      for (let i = configuration.renderingOrder.length - 1; i >= 0; i--) {
        let layerId = configuration.renderingOrder[i]
        let layerIdx = layers.findIndex(l => l.id === layerId)
        if (layerIdx > -1) {
          sortedLayers.push(layers[layerIdx])
        }
      }

      // get the tile matrix and estimated number of tiles
      const tileMatrix = getTileMatrix(configuration.boundingBoxFilter, configuration.sourceLayers, configuration.geopackageLayers, configuration.tileScalingEnabled, configuration.minZoom, configuration.maxZoom, projection, configuration.size)
      const estimatedNumberOfTiles = getZoomTileMatrixCount(tileMatrix)

      // determine the zoom level extents for the data, tracking the overall extent
      let totalExtent
      let layerZoomExtentMap = {}

      // setup map
      for (let z = minZoom; z <= maxZoom; z++) {
        layerZoomExtentMap[z] = {}
      }

      // updates the total extent
      const updateTotalExtent = (extent) => {
        if (extent != null) {
          if (totalExtent == null) {
            totalExtent = extent.slice()
          } else {
            totalExtent[0] = Math.min(totalExtent[0], extent[0])
            totalExtent[1] = Math.min(totalExtent[1], extent[1])
            totalExtent[2] = Math.max(totalExtent[2], extent[2])
            totalExtent[3] = Math.max(totalExtent[3], extent[3])
          }
        }
      }

      // converts an extent in 4326 to 3857
      const convertToWebMercator = (extent) => {
        let trimmedExtent = trimExtentToWebMercatorMax(extent)
        let filterLowerLeft = wgs84ToWebMercator.forward([trimmedExtent[0], trimmedExtent[1]])
        let filterUpperRight = wgs84ToWebMercator.forward([trimmedExtent[2], trimmedExtent[3]])
        return [filterLowerLeft[0], filterLowerLeft[1], filterUpperRight[0], filterUpperRight[1]]
      }

      // Determine the filtered extents for each layer at each zoom level. The drawing overlap width/height may increase this range.
      configuration.sourceLayers.forEach(layer => {
        updateTotalExtent(layer.extent)
        const trimmedExtent = trimExtentToFilter(layer.extent, configuration.boundingBoxFilter)
        if (layer.drawOverlap != null) {
          for (let i = minZoom; i <= maxZoom; i++) {
            const expandedExtent = getExpandedExtentForDrawOverlap(i, trimmedExtent, layer.drawOverlap, projection)
            layerZoomExtentMap[i][layer.id] = isWebMercator ? convertToWebMercator(expandedExtent) : expandedExtent.slice()
            if (i === maxZoom) {
              updateTotalExtent(expandedExtent)
            }
          }
        } else {
          const layerZoomExtent = isWebMercator ? convertToWebMercator(trimmedExtent) : trimmedExtent.slice()
          for (let i = minZoom; i <= maxZoom; i++) {
            layerZoomExtentMap[i][layer.id] = layerZoomExtent
          }
        }
      })

      configuration.geopackageLayers.forEach(layer => {
        const layerId = layer.geopackage.id + '_' + layer.table
        const extent = layer.geopackage.tables[layer.type === 'feature' ? 'features' : 'tiles'][layer.table].extent
        updateTotalExtent(extent)
        const trimmedExtent = trimExtentToFilter(extent, configuration.boundingBoxFilter)
        if (layer.drawOverlap != null) {
          for (let i = minZoom; i <= maxZoom; i++) {
            const expandedExtent = getExpandedExtentForDrawOverlap([i], trimmedExtent, layer.drawOverlap, projection)
            layerZoomExtentMap[i][layerId] = isWebMercator ? convertToWebMercator(expandedExtent) : expandedExtent.slice()
            if (i === maxZoom) {
              updateTotalExtent(expandedExtent)
            }
          }
        } else {
          const layerZoomExtent = isWebMercator ? convertToWebMercator(trimmedExtent) : trimmedExtent.slice()
          for (let i = minZoom; i <= maxZoom; i++) {
            layerZoomExtentMap[i][layerId] = layerZoomExtent
          }
        }
      })

      // total extent should just add up all the extents being considered and then filter them by the bounds
      if (totalExtent == null) {
        totalExtent = configuration.boundingBoxFilter
      } else {
        totalExtent = extentIntersection(totalExtent, configuration.boundingBoxFilter)
      }

      // set the contents bounds to the intersection of the filter and the merged extent of the data (i.e., if the merged extent is within the filter, minimize it to the intersection)
      totalExtent = isWebMercator ? trimExtentToWebMercatorMax(totalExtent) : trimExtentToWGS84Max(totalExtent)

      // todo: check if contents projection exists
      // todo: check if matrix projection exists


      let webMercatorSpatialReferenceSystem = gp.spatialReferenceSystemDao.getByOrganizationAndCoordSysId(EPSG, WEB_MERCATOR_CODE)
      if (webMercatorSpatialReferenceSystem == null) {
        gp.spatialReferenceSystemDao.createWebMercator()
        webMercatorSpatialReferenceSystem = gp.spatialReferenceSystemDao.getByOrganizationAndCoordSysId(EPSG, WEB_MERCATOR_CODE)
      }

      let wgs84SpatialReferenceSystem = gp.spatialReferenceSystemDao.getByOrganizationAndCoordSysId(EPSG, WORLD_GEODETIC_SYSTEM_CODE)
      if (wgs84SpatialReferenceSystem == null) {
        gp.spatialReferenceSystemDao.createWgs84()
        wgs84SpatialReferenceSystem = gp.spatialReferenceSystemDao.getByOrganizationAndCoordSysId(EPSG, WORLD_GEODETIC_SYSTEM_CODE)
      }

      const contentsBounds = new BoundingBox(totalExtent[0], totalExtent[2], totalExtent[1], totalExtent[3])
      const contentsSrsId = wgs84SpatialReferenceSystem.srs_id

      if (isWebMercator) {
        const matrixSetBounds = new BoundingBox(-20037508.342789244, 20037508.342789244, -20037508.342789244, 20037508.342789244)
        const matrixSrsId = webMercatorSpatialReferenceSystem.srs_id
        await gp.createStandardWebMercatorTileTable(tableName, contentsBounds, contentsSrsId, matrixSetBounds, matrixSrsId, minZoom, maxZoom)
      } else {
        const matrixSetBounds = new BoundingBox(-180.0, 180, -90, 90)
        const matrixSrsId = wgs84SpatialReferenceSystem.srs_id
        await gp.createStandardWGS84TileTable(tableName, contentsBounds, contentsSrsId, matrixSetBounds, matrixSrsId, minZoom, maxZoom)
      }

      const tileDao = gp.getTileDao(tableName)
      const tileRow = tileDao.newRow()

      if (configuration.tileScalingEnabled) {
        const tileScalingRecord = new TileScaling()
        tileScalingRecord.scaling_type = TileScalingType.OUT
        tileScalingRecord.zoom_in = null
        tileScalingRecord.zoom_out = 1
        const tileScalingExtension = gp.getTileScalingExtension(tableName)
        await tileScalingExtension.getOrCreateExtension()
        tileScalingExtension.createOrUpdate(tileScalingRecord)
      }

      await sleep(500)

      // update status to generating tiles
      status.message = 'Generating tiles...'
      throttleStatusCallback(status)
      let tilesAdded = 0
      let timeStart = new Date().getTime()
      const slowServerNotifier = new SlowServerNotifier()

      const boundingBoxFromXYZFunction = isWebMercator ? getWebMercatorBoundingBoxFromXYZ : getWGS84BoundingBoxFromXYZ

      await iterateTilesInMatrix(tileMatrix, async (z, x, y, layers) => {
        // setup canvas that we will draw each layer into
        let canvas = createCanvas(size.x, size.y)
        let buffer
        let ctx = canvas.getContext('2d')
        const tileBounds = boundingBoxFromXYZFunction(x, y, z)
        const tileWidth = tileBounds.maxLon - tileBounds.minLon
        const tileHeight = tileBounds.maxLat - tileBounds.minLat


        const getX = (lng, mathFunc) => {
          return mathFunc(size.x / tileWidth * (lng - tileBounds.minLon))
        }
        const getY = (lat, mathFunc) => {
          return mathFunc(size.y / tileHeight * (tileBounds.maxLat - lat))
        }

        const clippingMap = {}
        for (let i = 0; i < layers.length; i++) {
          const layerId = layers[i]
          const filteredExtent = layerZoomExtentMap[z][layerId]
          const minX = Math.min(size.x, Math.max(0, getX(filteredExtent[0], Math.floor) - 1))
          const maxX = Math.max(0, Math.min(size.x, getX(filteredExtent[2], Math.ceil) + 1))
          const minY = Math.min(size.y, Math.max(0, getY(filteredExtent[3], Math.ceil) - 1))
          const maxY = Math.max(0, Math.min(size.y, getY(filteredExtent[1], Math.floor) + 1))
          clippingMap[layerId] = [minX, minY, maxX - minX, maxY - minY]
        }

        await new Promise((resolve, reject) => {
          const tilePromises = []
          // iterate over each layer and get full tile
          for (let i = 0; i < sortedLayers.length; i++) {
            const layer = sortedLayers[i]
            if (layers.indexOf(layer.id) !== -1) {
              tilePromises.push(new Promise((resolve, reject) => {
                slowServerNotifier.beforeRender(layer)
                layer.renderTile(createUniqueID(), { x, y, z }, { x: size.x, y: size.y }, projection, (err, result) => {
                  slowServerNotifier.afterRender(layer)
                  if (err) {
                    reject(err)
                  } else if (!isNil(result)) {
                    try {
                      makeImage(result).then((image) => {
                        resolve({
                          image: image,
                          opacity: !isNil(layer.opacity) ? layer.opacity : 1.0,
                          layerId: layer.id
                        })
                      }).catch(e => {
                        reject(e)
                      })
                      // eslint-disable-next-line no-unused-vars
                    } catch (e) {
                      reject(e)
                    }
                  } else {
                    resolve({
                      image: null
                    })
                  }
                })
              }))
            }
          }
          // settle promises and draw onto the context
          Promise.allSettled(tilePromises).then(results => {
            results.forEach(result => {
              if (result.status === 'rejected') {
                // eslint-disable-next-line no-console
                console.error('Failed to render tile.')
                reject(result.reason)
              } else if (!isNil(result.value) && !isNil(result.value.image)) {
                ctx.save()
                ctx.globalAlpha = result.value.opacity
                ctx.beginPath()
                ctx.rect(clippingMap[result.value.layerId][0], clippingMap[result.value.layerId][1], clippingMap[result.value.layerId][2], clippingMap[result.value.layerId][3])
                ctx.clip()
                ctx.drawImage(result.value.image, 0, 0)
                disposeImage(result.value.image)
                ctx.globalAlpha = 1.0
                ctx.restore()
              }
            })
            resolve()
          })
        })

        buffer = await getImageBufferFromCanvas(canvas)
        if (buffer != null) {
          tileRow.resetId()
          tileRow.zoomLevel = z
          tileRow.tileColumn = x
          tileRow.tileRow = y
          tileRow.tileData = buffer
          tileDao.create(tileRow)
        }
        disposeCanvas(canvas)
        tilesAdded += 1
        const averageTimePerTile = (new Date().getTime() - timeStart) / tilesAdded
        status.message = 'Tiles processed: ' + tilesAdded + ' of ' + estimatedNumberOfTiles + '\nApprox. time remaining: ' + prettyPrintMs(averageTimePerTile * (estimatedNumberOfTiles - tilesAdded))
        status.progress = 20 + 80 * tilesAdded / estimatedNumberOfTiles

        slowServerNotifier.applyWarningMessage(status)

        throttleStatusCallback(status)
      })

      status.message = 'Completed in ' + prettyPrintMs(new Date().getTime() - buildStart) + '.'
      status.progress = 100.0
      statusCallback(status)
      await sleep(500)
    } catch (error) {
      try {
        await deleteGeoPackageTable(configuration.path, configuration.table)
        // eslint-disable-next-line no-empty
      } catch (e) {
      }
      status.message = 'Failed to build tile layer'
      status.error = error.message
      statusCallback(status)
    }
  }, true)
}

export {
  buildTileLayer
}
