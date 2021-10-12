import { BoundingBox, TileScaling, TileScalingType } from '@ngageoint/geopackage'
import isNil from 'lodash/isNil'
import throttle from 'lodash/throttle'
import imagemin from 'imagemin'
import imageminPngquant from 'imagemin-pngquant'
import {
  performSafeGeoPackageOperation,
  wait,
  prettyPrintMs,
  boundingBoxIntersection,
  deleteGeoPackageTable
} from './GeoPackageCommon'
import { constructLayer } from '../layer/LayerFactory'
import { trimExtentToFilter, trimExtentToWebMercatorMax } from '../util/xyz/XYZTileUtilities'
import { TileBoundingBoxUtils } from '@ngageoint/geopackage'
import { createCanvas, isBlank, hasTransparentPixels } from '../util/canvas/CanvasUtilities'
import { wgs84ToWebMercator } from '../projection/ProjectionUtilities'
import { constructRenderer } from '../leaflet/map/renderer/RendererFactory'
import { getTileMatrix, getZoomTileMatrixCount, iterateTilesInMatrix } from '../util/tile/TileUtilities'
import { createUniqueID } from '../util/UniqueIDUtilities'

/**
 * GeoPackgeTileTableBuilder handles building a tile layer given a user defined configuration
 * Note: this file only runs within an electron browser window (specifically, the worker window)
 */
/**
 * Builds a tile layer
 * @param configuration
 * @param statusCallback
 * @returns {Promise<any>}
 */
async function buildTileLayer (configuration, statusCallback) {
  return performSafeGeoPackageOperation(configuration.path, async (gp) => {
    const buildStart = new Date().getTime()

    const status = {
      message: 'Starting...',
      progress: 0.0
    }

    try {
      const throttleStatusCallback = throttle(statusCallback, 250)

      const tableName = configuration.table

      throttleStatusCallback(status)

      await wait(1000)

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

      const tileMatrix = getTileMatrix(configuration.boundingBoxFilter, configuration.sourceLayers, configuration.geopackageLayers, configuration.tileScalingEnabled, configuration.minZoom, configuration.maxZoom)
      const estimatedNumberOfTiles = getZoomTileMatrixCount(tileMatrix)

      let totalExtent
      const extents = configuration.sourceLayers.map(layer => layer.extent).concat(configuration.geopackageLayers.map(geopackageLayer => geopackageLayer.type === 'feature' ? geopackageLayer.geopackage.tables.features[geopackageLayer.table].extent : geopackageLayer.geopackage.tables.tiles[geopackageLayer.table].extent))
      extents.forEach(extent => {
        if (totalExtent == null) {
          totalExtent = extent.slice()
        } else {
          totalExtent[0] = Math.min(totalExtent[0], extent[0])
          totalExtent[1] = Math.min(totalExtent[1], extent[1])
          totalExtent[2] = Math.max(totalExtent[2], extent[2])
          totalExtent[3] = Math.max(totalExtent[3], extent[3])
        }
      })
      totalExtent = trimExtentToWebMercatorMax(trimExtentToFilter(totalExtent, configuration.boundingBoxFilter))

      const contentsBounds = new BoundingBox(totalExtent[0], totalExtent[2], totalExtent[1], totalExtent[3])
      const contentsSrsId = 4326
      const matrixSetBounds = new BoundingBox(-20037508.342789244, 20037508.342789244, -20037508.342789244, 20037508.342789244)
      const tileMatrixSetSrsId = 3857

      let contentsLowerLeft = wgs84ToWebMercator.forward([contentsBounds.minLongitude, contentsBounds.minLatitude])
      let contentsUpperRight = wgs84ToWebMercator.forward([contentsBounds.maxLongitude, contentsBounds.maxLatitude])
      const contentsWebMercator = new BoundingBox(contentsLowerLeft[0], contentsUpperRight[0], contentsLowerLeft[1], contentsUpperRight[1])

      await gp.createStandardWebMercatorTileTable(tableName, contentsBounds, contentsSrsId, matrixSetBounds, tileMatrixSetSrsId, minZoom, maxZoom)

      if (configuration.tileScalingEnabled) {
        const tileScalingRecord = new TileScaling()
        tileScalingRecord.scaling_type = TileScalingType.OUT
        tileScalingRecord.zoom_in = null
        tileScalingRecord.zoom_out = 1
        const tileScalingExtension = gp.getTileScalingExtension(tableName)
        await tileScalingExtension.getOrCreateExtension()
        tileScalingExtension.createOrUpdate(tileScalingRecord)
      }

      await wait(500)

      // update status to generating tiles
      status.message = 'Generating tiles...'
      throttleStatusCallback(status)
      let tilesAdded = 0
      let timeStart = new Date().getTime()

      await iterateTilesInMatrix(tileMatrix, async (z, x, y) => {
        // setup canvas that we will draw each layer into
        let canvas = createCanvas(256, 256)
        let ctx = canvas.getContext('2d')

        let tileBounds = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
        let tileBoundingBox = new BoundingBox(tileBounds.minLongitude, tileBounds.maxLongitude, tileBounds.minLatitude, tileBounds.maxLatitude)
        const tileWidth = tileBoundingBox.maxLongitude - tileBoundingBox.minLongitude
        const tileHeight = tileBoundingBox.maxLatitude - tileBoundingBox.minLatitude
        // clips tile so that only the intersection of the tile and the user specified bounds are drawn
        const intersection = boundingBoxIntersection(tileBoundingBox, contentsWebMercator)
        let clippingRectangle
        if (!isNil(intersection)) {
          const getX = (lng, mathFunc) => {
            return mathFunc(256.0 / tileWidth * (lng - tileBoundingBox.minLongitude))
          }
          const getY = (lat, mathFunc) => {
            return mathFunc(256.0 / tileHeight * (tileBoundingBox.maxLatitude - lat))
          }
          const minX = Math.max(0, getX(intersection.minLongitude, Math.floor) - 1)
          const maxX = Math.min(256, getX(intersection.maxLongitude, Math.ceil) + 1)
          const minY = Math.max(0, getY(intersection.maxLatitude, Math.ceil) - 1)
          const maxY = Math.min(256, getY(intersection.minLatitude, Math.floor) + 1)
          clippingRectangle = [minX, minY, maxX - minX, maxY - minY]
        }

        await new Promise((resolve, reject) => {
          const tilePromises = []
          for (let i = 0; i < sortedLayers.length; i++) {
            const layer = sortedLayers[i]
            tilePromises.push(new Promise((resolve, reject) => {
              layer.renderTile(createUniqueID(), {x, y, z}, (err, result) => {
                if (err) {
                  reject(err)
                } else if (!isNil(result)) {
                  try {
                    let img = new Image()
                    img.onload = () => {
                      resolve({
                        image: img,
                        opacity: !isNil(layer.opacity) ? layer.opacity : 1.0,
                        drawOverlap: layer._configuration.drawOverlap
                      })
                    }
                    img.onerror = (e) => {
                      reject(e)
                    }
                    img.src = result
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
          // settle promises and draw onto the context
          Promise.allSettled(tilePromises).then(results => {
            results.forEach(result => {
              if (result.status === 'rejected') {
                console.error('Failed to render tile.')
                reject(result.reason)
              } else if (!isNil(result.value) && !isNil(result.value.image)) {
                ctx.save()
                ctx.globalAlpha = result.value.opacity
                if (!isNil(clippingRectangle)) {
                  ctx.beginPath()
                  if (!isNil(result.value.drawOverlap)) {
                    ctx.rect(Math.max(0, clippingRectangle[0] - result.value.drawOverlap.width),
                      Math.max(0, clippingRectangle[1] - result.value.drawOverlap.height),
                      Math.min(256, clippingRectangle[2] + result.value.drawOverlap.width * 2),
                      Math.min(256, clippingRectangle[3] + result.value.drawOverlap.height * 2))
                  } else {
                    ctx.rect(clippingRectangle[0], clippingRectangle[1], clippingRectangle[2], clippingRectangle[3])
                  }
                  ctx.clip()
                }
                ctx.drawImage(result.value.image, 0, 0)
                ctx.globalAlpha = 1.0
                ctx.restore()
              }
            })
            resolve()
          })
        })

        // look at merged canvas
        if (!isBlank(canvas)) {
          if (hasTransparentPixels(canvas)) {
            try {
              const buffer = await imagemin.buffer(Buffer.from(canvas.toDataURL('image/png').split(',')[1], 'base64'), {
                plugins: [
                  imageminPngquant({
                    speed: 8,
                    quality: [0.5, 0.8]
                  })
                ]
              })
              gp.addTile(buffer, tableName, z, y, x)
              // eslint-disable-next-line no-unused-vars
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('Failed to add tile')
            }
          } else {
            gp.addTile(Buffer.from(canvas.toDataURL('image/jpeg', { quality: 0.7 }).split(',')[1], 'base64'), tableName, z, y, x)
          }
        }
        if (canvas.dispose) {
          canvas.dispose()
          canvas = null
        }
        tilesAdded += 1
        const averageTimePerTile = (new Date().getTime() - timeStart) / tilesAdded
        status.message = 'Tiles processed: ' + tilesAdded + ' of ' + estimatedNumberOfTiles + '\nApprox. time remaining: ' + prettyPrintMs(averageTimePerTile * (estimatedNumberOfTiles - tilesAdded))
        status.progress = 20 + 80 * tilesAdded / estimatedNumberOfTiles
        throttleStatusCallback(status)
      })

      status.message = 'Completed in ' + prettyPrintMs(new Date().getTime() - buildStart) + '.'
      status.progress = 100.0
      statusCallback(status)
      await wait(500)
    } catch (error) {
      try {
        await deleteGeoPackageTable(configuration.path, configuration.table)
        // eslint-disable-next-line no-empty
      } catch (e) {}
      status.message = 'Failed to build tile layer'
      status.error = error.message
      statusCallback(status)
    }
  }, true)
}
export {
  buildTileLayer
}
