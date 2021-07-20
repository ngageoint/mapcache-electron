import { BoundingBox } from '@ngageoint/geopackage'
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
import { trimToWebMercatorMax, iterateAllTilesInExtentForZoomLevels } from '../util/XYZTileUtilities'
import { TileBoundingBoxUtils } from '@ngageoint/geopackage'
import { createCanvas, isBlank, hasTransparentPixels } from '../util/CanvasUtilities'
import { wgs84ToWebMercator } from '../projection/ProjectionUtilities'
import isNil from 'lodash/isNil'
import throttle from 'lodash/throttle'
import { estimatedTileCount } from './GeoPackageTileTableUtilities'
import { constructRenderer } from '../leaflet/map/renderer/RendererFactory'

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

      // create geopackage table
      let { estimatedNumberOfTiles, tileScaling, boundingBox, zoomLevels } = estimatedTileCount(configuration.boundingBoxFilter, configuration.sourceLayers, configuration.geopackageLayers, configuration.tileScaling, configuration.minZoom, configuration.maxZoom)
      boundingBox = trimToWebMercatorMax(boundingBox)

      const contentsBounds = new BoundingBox(boundingBox[0][1], boundingBox[1][1], boundingBox[0][0], boundingBox[1][0])
      const contentsSrsId = 4326
      const matrixSetBounds = new BoundingBox(-20037508.342789244, 20037508.342789244, -20037508.342789244, 20037508.342789244)
      const tileMatrixSetSrsId = 3857

      let contentsLowerLeft = wgs84ToWebMercator.forward([contentsBounds.minLongitude, contentsBounds.minLatitude])
      let contentsUpperRight = wgs84ToWebMercator.forward([contentsBounds.maxLongitude, contentsBounds.maxLatitude])
      const contentsWebMercator = new BoundingBox(contentsLowerLeft[0], contentsUpperRight[0], contentsLowerLeft[1], contentsUpperRight[1])

      await gp.createStandardWebMercatorTileTable(tableName, contentsBounds, contentsSrsId, matrixSetBounds, tileMatrixSetSrsId, minZoom, maxZoom)

      if (!isNil(tileScaling)) {
        const tileScalingExtension = gp.getTileScalingExtension(tableName)
        await tileScalingExtension.getOrCreateExtension()
        tileScalingExtension.createOrUpdate(tileScaling)
      }

      await wait(500)

      // update status to generating tiles
      status.message = 'Generating tiles...'
      throttleStatusCallback(status)
      let tilesAdded = 0
      let timeStart = new Date().getTime()
      await iterateAllTilesInExtentForZoomLevels(boundingBox, zoomLevels, async ({z, x, y}) => {
        // setup canvas that we will draw each layer into
        let canvas = createCanvas(256, 256)
        let ctx = canvas.getContext('2d')

        let tileBounds = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
        let tileBoundingBox = new BoundingBox(tileBounds.minLongitude, tileBounds.maxLongitude, tileBounds.minLatitude, tileBounds.maxLatitude)
        const tileWidth = tileBoundingBox.maxLongitude - tileBoundingBox.minLongitude
        const tileHeight = tileBoundingBox.maxLatitude - tileBoundingBox.minLatitude
        // clips tile so that only the intersection of the tile and the user specified bounds are drawn
        const intersection = boundingBoxIntersection(tileBoundingBox, contentsWebMercator)
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
          ctx.beginPath()
          ctx.rect(minX, minY, maxX - minX, maxY - minY)
          ctx.clip()
        }

        ctx.save()

        await new Promise((resolve, reject) => {
          // iteratre over sorted layers and push promises in sorted order
          const tilePromises = []
          for (let i = 0; i < sortedLayers.length; i++) {
            const layer = sortedLayers[i]
            tilePromises.push(new Promise((resolve, reject) => {
              layer.renderTile({x, y, z}, (err, result) => {
                if (err) {
                  reject(err)
                } else if (!isNil(result)) {
                  try {
                    let img = new Image()
                    img.onload = () => {
                      resolve({
                        image: img,
                        opacity: !isNil(layer.opacity) ? layer.opacity : 1.0
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
                ctx.globalAlpha = result.value.opacity
                ctx.drawImage(result.value.image, 0, 0)
                ctx.globalAlpha = 1.0
              }
            })
            resolve()
          })
        })
        ctx.restore()

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
          canvas.dispose();
          canvas = null;
        }
        tilesAdded += 1
        const averageTimePerTile = (new Date().getTime() - timeStart) / tilesAdded
        status.message = 'Tiles processed: ' + tilesAdded + ' of ' + estimatedNumberOfTiles + '\nApprox. time remaining: ' + prettyPrintMs(averageTimePerTile * (estimatedNumberOfTiles - tilesAdded))
        status.progress = 20 + 80 * tilesAdded / estimatedNumberOfTiles
        throttleStatusCallback(status)
      })

      // close geopackage vector and tile layers
      sortedLayers.forEach(layer => {
        if (!isNil(layer.close) && typeof layer.close === 'function') {
          layer.close()
        }
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
