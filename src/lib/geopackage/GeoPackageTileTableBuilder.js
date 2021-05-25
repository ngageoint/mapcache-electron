import { BoundingBox } from '@ngageoint/geopackage'
import imagemin from 'imagemin'
import imageminPngquant from 'imagemin-pngquant'
import GeoPackageCommon from './GeoPackageCommon'
import LayerFactory from '../source/layer/LayerFactory'
import XYZTileUtilities from '../util/XYZTileUtilities'
import { TileBoundingBoxUtils } from '@ngageoint/geopackage'
import CanvasUtilities from '../util/CanvasUtilities'
import ProjectionUtilities from '../projection/ProjectionUtilities'
import isNil from 'lodash/isNil'
import throttle from 'lodash/throttle'
import GeoPackageTileTableUtilities from './GeoPackageTileTableUtilities'
import RendererFactory from '../source/layer/renderer/RendererFactory'
import ProjectActions from '../vuex/ProjectActions'
import ElectronGeoPackageTileRenderer from '../source/layer/renderer/ElectronGeoPackageTileRenderer'
import ElectronGeoPackageRenderer from '../source/layer/renderer/ElectronGeoPackageRenderer'

/**
 * GeoPackgeTileTableBuilder handles building a tile layer given a user defined configuration
 * Note: this file only runs within an electron browser window (specifically, the worker window)
 */
export default class GeoPackageTileTableBuilder {
  /**
   * Builds a tile layer
   * @param configuration
   * @param statusCallback
   * @returns {Promise<any>}
   */
  static async buildTileLayer (configuration, statusCallback) {
    return GeoPackageCommon.performSafeGeoPackageOperation(configuration.path, async (gp) => {
      const status = {
        message: 'Starting...',
        progress: 0.0
      }

      const throttleStatusCallback = throttle(statusCallback, 100)

      const tableName = configuration.table

      throttleStatusCallback(status)

      await GeoPackageCommon.wait(1000)

      let minZoom = configuration.minZoom
      let maxZoom = configuration.maxZoom

      status.message = 'Preparing layers...'

      throttleStatusCallback(status)


      let layersPrepared = 0
      const numberOfLayers = configuration.sourceLayers.length + configuration.geopackageLayers.length
      let layers = []

      for (let i = 0; i < configuration.sourceLayers.length; i++) {
        const sourceLayer = configuration.sourceLayers[i]
        const layer = LayerFactory.constructLayer(sourceLayer)
        await layer.initialize()
        layer.setRenderer(RendererFactory.constructRenderer(layer))

        // TODO: be sure to pre-test each connection to ensure data is available for building layer..
        try {
          // if (LayerTypes.isRemote(layer)) {
          //   await layer.testConnection(false)
          // }
          layers.push(layer)
          // eslint-disable-next-line no-unused-vars
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to initialize data source.')
          status.message = 'Failed to initialize data source: ' + isNil(layer.displayName) ? layer.name : layer.displayName
          status.error = {
            layer: layer.id,
            error: error
          }
          throttleStatusCallback(status)
          // if an error occurs trying to initialize a source, we should exit
          ProjectActions.setSourceError({id: layer.id, error: error})
          return
        }
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
          layer = LayerFactory.constructLayer({
            id: geopackage.id + '_' + tableName,
            geopackageFilePath: geopackage.path,
            sourceDirectory: geopackage.path,
            sourceLayerName: tableName,
            sourceType: 'GeoPackage',
            layerType: 'Vector',
            count: geopackage.tables.features[tableName].featureCount,
            extent: geopackage.tables.features[tableName].extent,
          })
          await layer.initialize().catch(e => {
            console.error(e)
          })
          layer.setRenderer(new ElectronGeoPackageRenderer(layer))
        } else {
          layer = LayerFactory.constructLayer({
            id: geopackage.id + '_' + tableName,
            filePath: geopackage.path,
            sourceLayerName: tableName,
            layerType: 'GeoPackage',
            extent: geopackage.tables.tiles[tableName].extent
          })
          await layer.initialize().catch(e => {
            console.error(e)
          })
          layer.setRenderer(new ElectronGeoPackageTileRenderer(layer))
        }

        layers.push(layer)
        layersPrepared++
        status.progress = 20.0 * layersPrepared / numberOfLayers
        throttleStatusCallback(status)
      }

      // sort layers into rendering order
      let sortedLayers = []
      for (let i = 0; i < configuration.renderingOrder.length; i++) {
        let layerId = configuration.renderingOrder[i]
        let layerIdx = layers.findIndex(l => l.id === layerId)
        if (layerIdx > -1) {
          sortedLayers.push(layers[layerIdx])
        }
      }

      // create geopackage table
      let { estimatedNumberOfTiles, tileScaling, boundingBox, zoomLevels } = GeoPackageTileTableUtilities.estimatedTileCount(configuration.boundingBoxFilter, configuration.sourceLayers, configuration.geopackageLayers, configuration.tileScaling, configuration.minZoom, configuration.maxZoom)
      boundingBox = XYZTileUtilities.trimToWebMercatorMax(boundingBox)

      const contentsBounds = new BoundingBox(boundingBox[0][1], boundingBox[1][1], boundingBox[0][0], boundingBox[1][0])
      const contentsSrsId = 4326
      const matrixSetBounds = new BoundingBox(-20037508.342789244, 20037508.342789244, -20037508.342789244, 20037508.342789244)
      const tileMatrixSetSrsId = 3857

      let contentsLowerLeft = ProjectionUtilities.wgs84ToWebMercator.forward([contentsBounds.minLongitude, contentsBounds.minLatitude])
      let contentsUpperRight = ProjectionUtilities.wgs84ToWebMercator.forward([contentsBounds.maxLongitude, contentsBounds.maxLatitude])
      const contentsWebMercator = new BoundingBox(contentsLowerLeft[0], contentsUpperRight[0], contentsLowerLeft[1], contentsUpperRight[1])

      try {
        await gp.createStandardWebMercatorTileTable(tableName, contentsBounds, contentsSrsId, matrixSetBounds, tileMatrixSetSrsId, minZoom, maxZoom)
        // eslint-disable-next-line no-unused-vars
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to create tile table...')
        status.message = 'Failed: Unable to create tile table...'
        statusCallback(status)
        return
      }

      if (!isNil(tileScaling)) {
        const tileScalingExtension = gp.getTileScalingExtension(tableName)
        await tileScalingExtension.getOrCreateExtension()
        tileScalingExtension.createOrUpdate(tileScaling)
      }

      await GeoPackageCommon.wait(500)

      // update status to generating tiles
      status.message = 'Generating tiles...'
      throttleStatusCallback(status)
      let tilesAdded = 0
      let timeStart = new Date().getTime()
      await XYZTileUtilities.iterateAllTilesInExtentForZoomLevels(boundingBox, zoomLevels, async ({z, x, y}) => {
        // setup canvas that we will draw each layer into
        let canvas = CanvasUtilities.createCanvas(256, 256)
        let ctx = canvas.getContext('2d')

        let tileBounds = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, z)
        let tileBoundingBox = new BoundingBox(tileBounds.minLon, tileBounds.maxLon, tileBounds.minLat, tileBounds.maxLat)
        const tileWidth = tileBoundingBox.maxLongitude - tileBoundingBox.minLongitude
        const tileHeight = tileBoundingBox.maxLatitude - tileBoundingBox.minLatitude
        // clips tile so that only the intersection of the tile and the user specified bounds are drawn
        const intersection = GeoPackageCommon.intersection(tileBoundingBox, contentsWebMercator)
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

        try {
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
        } catch (e) {
          console.error(e)
          status.message = e.message || 'Failed to render tile'
          statusCallback(status)
          await GeoPackageCommon.wait(10000)

        }

        // for (let i = 0; i < sortedLayers.length; i++) {
        //   await new Promise((resolve, reject) => {
        //     let layer = sortedLayers[i]
        //     layer.renderTile({x, y, z}, (err, result) => {
        //       if (err) {
        //         // eslint-disable-next-line no-console
        //         console.error('Failed to render tile.')
        //         reject(err)
        //       } else if (!isNil(result)) {
        //         try {
        //           let img = new Image()
        //           img.onload = () => {
        //             ctx.globalAlpha = !isNil(layer.opacity) ? layer.opacity : 1.0
        //             ctx.drawImage(img, 0, 0)
        //             ctx.globalAlpha = 1.0
        //             resolve()
        //           }
        //           img.onerror = () => {
        //             // eslint-disable-next-line no-console
        //             console.error('Failed to load image.')
        //             resolve()
        //           }
        //           img.src = result
        //           // eslint-disable-next-line no-unused-vars
        //         } catch (e) {
        //           // eslint-disable-next-line no-console
        //           console.error('Failed to load image.')
        //           resolve()
        //         }
        //       } else {
        //         resolve()
        //       }
        //     })
        //   })
        // }

        // look at merged canvas
        if (!CanvasUtilities.isBlank(canvas)) {
          if (CanvasUtilities.hasTransparentPixels(canvas)) {
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
            gp.addTile(canvas.toBuffer('image/jpeg', { quality: 0.7 }), tableName, z, y, x)
          }
        }
        if (canvas.dispose) {
          canvas.dispose();
          canvas = null;
        }
        tilesAdded += 1
        const averageTimePerTile = (new Date().getTime() - timeStart) / tilesAdded
        status.message = 'Tiles processed: ' + tilesAdded + ' of ' + estimatedNumberOfTiles + '\nApprox. time remaining: ' + GeoPackageCommon.prettyPrintMs(averageTimePerTile * (estimatedNumberOfTiles - tilesAdded))
        status.progress = 20 + 80 * tilesAdded / estimatedNumberOfTiles
        throttleStatusCallback(status)
      })

      for (let i = 0; i < sortedLayers.length; i++) {
        let layer = sortedLayers[i]
        if (layer.close) {
          layer.close()
        }
      }

      status.message = 'Completed.'
      status.progress = 100.0
      statusCallback(status)
      await GeoPackageCommon.wait(500)
    }, true)
  }
}
