import { GeoPackageAPI, BoundingBox } from '@ngageoint/geopackage'
import LayerFactory from './layer/LayerFactory'
import XYZTileUtilities from '../XYZTileUtilities'
import imagemin from 'imagemin'
import imageminPngquant from 'imagemin-pngquant'
import CanvasUtilities from '../CanvasUtilities'
import GeoPackageUtilities from '../GeoPackageUtilities'
import _ from 'lodash'
import fs from 'fs'

export default class GeoPackageBuilder {
  config
  project

  static BUILD_MODES = {
    STARTED: 0,
    FAILED: 1,
    COMPLETED: 2
  }

  constructor (config, project, store) {
    this.config = config
    this.project = project
    this.store = store
  }

  dispatchStatusUpdate (status) {
    this.store.dispatch('Projects/setGeoPackageStatus', {
      projectId: this.project.id,
      geopackageId: this.config.id,
      status
    })
  }
  dispatchBuildMode (buildMode) {
    this.store.dispatch('Projects/setGeoPackageBuildMode', {
      projectId: this.project.id,
      geopackageId: this.config.id,
      buildMode: buildMode
    })
  }

  async getFeaturesInBounds (geopackage, vectorConfiguration) {
    let numberOfFeatures = 0
    if (vectorConfiguration.boundingBox) {
      for (let i = 0; i < vectorConfiguration.vectorLayers.length; i++) {
        let vectorLayer = geopackage.vectorLayers[vectorConfiguration.vectorLayers[i]]
        if (vectorLayer.geopackageFilePath) {
          numberOfFeatures += await GeoPackageUtilities.getFeatureCountInBoundingBox(vectorLayer.geopackageFilePath, vectorLayer.sourceLayerName, vectorConfiguration.boundingBox)
        }
      }
    }
    return numberOfFeatures
  }

  async go () {
    let result = {}
    let gp
    try {
      let status = {
        configurationExecuting: null,
        configurationStatus: {}
      }
      this.dispatchBuildMode(GeoPackageBuilder.BUILD_MODES.STARTED)
      this.dispatchStatusUpdate(status)

      if (fs.existsSync(this.config.fileName)) {
        try {
          fs.unlinkSync(this.config.fileName)
        } catch (error) {
          console.error(error)
        }
      }

      gp = await GeoPackageAPI.create(this.config.fileName)

      // iterate over vector configurations
      for (const vectorConfigIdx in this.config.vectorConfigurations) {
        const vectorConfig = this.config.vectorConfigurations[vectorConfigIdx]
        status.configurationExecuting = vectorConfig.id
        status.configurationStatus[vectorConfig.id] = {
          id: vectorConfig.id,
          configurationName: vectorConfig.configurationName,
          creation: 'Started',
          featuresAdded: 0,
          featuresToAdd: await this.getFeaturesInBounds(this.config, vectorConfig),
          indexing: false,
          type: 'vector',
          error: null
        }
        this.dispatchStatusUpdate(status)

        for (let index in vectorConfig.vectorLayers) {
          let geoPackageSource
          let vectorLayer = vectorConfig.vectorLayers[index]
          try {
            let layerConfig = this.project.layers[vectorLayer]
            let sourceFeatureTableName = layerConfig.sourceLayerName
            let targetFeatureTableName = layerConfig.sourceLayerName
            geoPackageSource = await GeoPackageAPI.open(layerConfig.geopackageFilePath)
            status.configurationStatus[vectorConfig.id].featuresAdded += await GeoPackageUtilities.copyGeoPackageFeaturesAndStylesForBoundingBox(geoPackageSource, gp, sourceFeatureTableName, targetFeatureTableName, vectorConfig.boundingBox)
            this.dispatchStatusUpdate(status)
            if (vectorConfig.indexed) {
              status.configurationStatus[vectorConfig.id].indexing = true
              this.dispatchStatusUpdate(status)
              await GeoPackageUtilities._indexFeatureTable(gp, targetFeatureTableName)
              status.configurationStatus[vectorConfig.id].indexing = false
              this.dispatchStatusUpdate(status)
            }
          } catch (error) {
            console.error(error)
            status.configurationStatus[vectorConfig.id].creation = 'Failed'
            status.configurationStatus[vectorConfig.id].error = error.message
            this.dispatchStatusUpdate(status)
          }
          if (!_.isNil(geoPackageSource)) {
            try {
              geoPackageSource.close()
            } catch (error) {
              console.error(error)
            }
          }
        }
        status.configurationStatus[vectorConfig.id].creation = 'Completed'
        this.dispatchStatusUpdate(status)
      }

      // iterate over tile configurations
      for (const tileConfigIdx in this.config.tileConfigurations) {
        const tileConfig = this.config.tileConfigurations[tileConfigIdx]
        let minZoom = tileConfig.minZoom
        let maxZoom = tileConfig.maxZoom

        const { estimatedNumberOfTiles, tileScaling, boundingBox, zoomLevels } = GeoPackageUtilities.tileConfigurationEstimatedWork(this.project, tileConfig)

        status.configurationExecuting = tileConfig.id
        status.configurationStatus[tileConfig.id] = {
          id: tileConfig.id,
          configurationName: tileConfig.configurationName,
          creation: 'Preparing Layers',
          tilesAdded: 0,
          error: null,
          type: 'tile',
          tilesToAdd: estimatedNumberOfTiles
        }

        this.dispatchStatusUpdate(status)
        const contentsBounds = new BoundingBox(boundingBox[0][1], boundingBox[1][1], boundingBox[0][0], boundingBox[1][0])
        const contentsSrsId = 4326
        const matrixSetBounds = new BoundingBox(-20037508.342789244, 20037508.342789244, -20037508.342789244, 20037508.342789244)
        const tileMatrixSetSrsId = 3857
        await gp.createStandardWebMercatorTileTable(tileConfig.tableName, contentsBounds, contentsSrsId, matrixSetBounds, tileMatrixSetSrsId, minZoom, maxZoom)

        if (!_.isNil(tileScaling)) {
          const tileScalingExtension = gp.getTileScalingExtension(tileConfig.tableName)
          await tileScalingExtension.getOrCreateExtension()
          tileScalingExtension.createOrUpdate(tileScaling)
        }

        let layers = []
        for (let index in tileConfig.tileLayers) {
          let tileLayerId = tileConfig.tileLayers[index]
          let layerConfig = this.project.layers[tileLayerId]
          let layer = LayerFactory.constructLayer(layerConfig)
          layers.push(await layer.initialize())
        }
        for (let index in tileConfig.vectorLayers) {
          let vectorLayerId = tileConfig.vectorLayers[index]
          let layerConfig = _.cloneDeep(this.project.layers[vectorLayerId])
          layerConfig.maxFeatures = Number.MAX_SAFE_INTEGER
          let layer = LayerFactory.constructLayer(layerConfig)
          layers.push(await layer.initialize())
        }
        // sort layers into rendering order
        let sortedLayers = []
        for (let index in tileConfig.renderingOrder) {
          let layer = tileConfig.renderingOrder[index]
          let layerIdx = layers.findIndex(l => l.id === layer.id)
          if (layerIdx > -1) {
            sortedLayers.push(layers[layerIdx])
          }
        }

        // update status to generating tiles
        status.configurationStatus[tileConfig.id].creation = 'Building Tiles'
        this.dispatchStatusUpdate(status)
        let time = Date.now()
        await XYZTileUtilities.iterateAllTilesInExtentForZoomLevels(boundingBox, zoomLevels, async ({z, x, y}) => {
          // setup canvas that we will draw each layer into
          let canvas = document.createElement('canvas')
          canvas.width = 256
          canvas.height = 256
          let ctx = canvas.getContext('2d')
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          // iterate over each layer and generate the tile for that layer
          for (let i = 0; i < sortedLayers.length; i++) {
            await new Promise((resolve, reject) => {
              let layer = sortedLayers[i]
              layer.renderTile({x, y, z}, null, (err, result) => {
                if (err) {
                  console.error(err)
                  reject(err)
                } else if (!_.isNil(result)) {
                  try {
                    let image
                    // result could be a buffer, a canvas, or a data url (string)
                    if (typeof result === 'string') {
                      image = result
                    } else {
                      image = result.toDataURL()
                    }
                    let img = new Image()
                    img.onload = () => {
                      ctx.drawImage(img, 0, 0)
                      resolve()
                    }
                    img.onerror = (error) => {
                      console.log(error)
                      resolve()
                    }
                    img.src = image
                  } catch (error) {
                    console.error(error)
                    resolve()
                  }
                } else {
                  resolve()
                }
              })
            })
          }
          // look at merged canvas
          if (!CanvasUtilities.isBlank(canvas)) {
            await new Promise((resolve) => {
              if (CanvasUtilities.hasTransparentPixels(canvas)) {
                canvas.toBlob((blob) => {
                  let reader = new FileReader()
                  reader.addEventListener('loadend', async function () {
                    const buffer = await imagemin.buffer(Buffer.from(reader.result), {
                      plugins: [
                        imageminPngquant({
                          speed: 8,
                          quality: [0.5, 0.8]
                        })
                      ]
                    })
                    gp.addTile(buffer, tileConfig.tableName, z, y, x)
                    resolve(false)
                  })
                  reader.readAsArrayBuffer(blob)
                }, 'image/png')
              } else {
                canvas.toBlob((blob) => {
                  const reader = new FileReader()
                  reader.addEventListener('loadend', function () {
                    gp.addTile(Buffer.from(reader.result), tileConfig.tableName, z, y, x)
                    resolve(false)
                  })
                  reader.readAsArrayBuffer(blob)
                }, 'image/jpeg', 0.7)
              }
            })
          }
          status.configurationStatus[tileConfig.id].tilesAdded += 1
          if (Date.now() - time > 1000) {
            time = Date.now()
            this.dispatchStatusUpdate(status)
          }
        })
      }
      this.dispatchStatusUpdate(status)
      this.dispatchBuildMode(GeoPackageBuilder.BUILD_MODES.COMPLETED)
    } catch (error) {
      this.dispatchBuildMode(GeoPackageBuilder.BUILD_MODES.FAILED)
      console.error(error)
      result.error = error
    }
    if (!_.isNil(gp)) {
      try {
        gp.close()
      } catch (error) {
        console.error(error)
      }
    }
    return result
  }
}
