import GeoPackage from '@ngageoint/geopackage'
import LayerFactory from './layer/LayerFactory'
import XYZTileUtilities from '../XYZTileUtilities'
import store from '../../store'

export default class GeoPackageBuilder {
  config
  project

  constructor (config, project) {
    this.config = config
    this.project = project
  }

  dispatchStatusUpdate (status) {
    store.dispatch('Projects/setGeoPackageStatus', {
      projectId: this.project.id,
      geopackageId: this.config.id,
      status
    })
  }

  async go () {
    let blankCanvas = document.createElement('canvas')
    blankCanvas.width = 256
    blankCanvas.height = 256
    let blankURL = blankCanvas.toDataURL()

    let status = {
      creation: 'Started',
      layerStatus: {}
    }

    this.dispatchStatusUpdate(status)

    let gp = await GeoPackage.create(this.config.fileName)

    // execute feature configurations
    for (const layerId in this.config.featureLayers) {
      let geopackageLayerConfig = this.config.featureLayers[layerId]
      if (!geopackageLayerConfig.included) {
        continue
      }
      let layerStatus = {
        layerId,
        creation: 'Started',
        featuresAdded: 0,
        remainingTime: 0,
        startTime: Date.now()
      }
      status.layerStatus[layerId] = layerStatus
      this.dispatchStatusUpdate(status)
      try {
        let aoi = this.config.featureLayersShareBounds ? this.config.featureAoi : geopackageLayerConfig.aoi
        let layerConfig = this.project.layers[layerId]
        let layer = LayerFactory.constructLayer(layerConfig)
        await layer.initialize()
        // get the vectors in the bounds
        let layerColumns = layer.getLayerColumns()
        const FeatureColumn = GeoPackage.FeatureColumn
        let geometryColumns = new GeoPackage.GeometryColumns()
        geometryColumns.table_name = geopackageLayerConfig.layerName || geopackageLayerConfig.name
        geometryColumns.column_name = layerColumns.geom.name
        geometryColumns.geometry_type_name = 'GEOMETRYCOLLECTION'
        geometryColumns.z = 0
        geometryColumns.m = 0

        let columns = []
        columns.push(FeatureColumn.createPrimaryKeyColumnWithIndexAndName(0, layerColumns.id.name))
        columns.push(FeatureColumn.createGeometryColumn(1, layerColumns.geom.name, 'GEOMETRYCOLLECTION', false, null))
        let columnCount = 2
        for (const column of layerColumns.columns) {
          if (column.name !== layerColumns.id.name && column.name !== layerColumns.geom.name) {
            // console.log('Pushing column', column)
            // console.log('data type', GeoPackage.DataTypes.fromName(column.dataType))
            columns.push(FeatureColumn.createColumnWithIndex(columnCount++, column.name, GeoPackage.DataTypes.fromName(column.dataType), column.notNull, column.defaultValue))
          }
        }
        let bb = new GeoPackage.BoundingBox(aoi[0][1], aoi[1][1], aoi[0][0], aoi[1][0])
        await gp.createFeatureTableWithGeometryColumns(geometryColumns, bb, 4326, columns)
        let iterator = await layer.iterateFeaturesInBounds(aoi)
        for (let feature of iterator) {
          // console.log('adding feature', feature)
          GeoPackage.addGeoJSONFeatureToGeoPackage(gp, feature, geopackageLayerConfig.layerName || geopackageLayerConfig.name)
          layerStatus.featuresAdded++
          if (layerStatus.featuresAdded % 10 === 0) {
            this.dispatchStatusUpdate(status)
          }
        }
        layerStatus.creation = 'Completed'
        this.dispatchStatusUpdate(status)
      } catch (error) {
        layerStatus.creation = 'Failed'
        layerStatus.error = error
        this.dispatchStatusUpdate(status)
      }
    }

    // execute imagery configurations
    for (const layerId in this.config.imageryLayers) {
      let geopackageLayerConfig = this.config.imageryLayers[layerId]
      if (!geopackageLayerConfig.included) {
        continue
      }
      let aoi = this.config.imageryLayersShareBounds ? this.config.imageryAoi : geopackageLayerConfig.aoi
      let minZoom = Number(this.config.imageryLayersShareBounds ? this.config.minZoom : geopackageLayerConfig.minZoom)
      let maxZoom = Number(this.config.imageryLayersShareBounds ? this.config.maxZoom : geopackageLayerConfig.maxZoom)
      let layerConfig = this.project.layers[layerId]
      let layerStatus = {
        layerId,
        totalTileCount: XYZTileUtilities.tileCountInExtent(aoi, minZoom, maxZoom),
        creation: 'Started',
        totalSize: 0,
        remainingTime: 0,
        startTime: Date.now()
      }
      status.layerStatus[layerId] = layerStatus
      this.dispatchStatusUpdate(status)

      try {
        let layer = LayerFactory.constructLayer(layerConfig)
        await layer.initialize()
        // console.log('Tile Layer')
        const contentsBounds = new GeoPackage.BoundingBox(aoi[0][1], aoi[1][1], aoi[0][0], aoi[1][0]).projectBoundingBox('EPSG:4326', 'EPSG:3857')
        const contentsSrsId = 3857
        const matrixSetBounds = new GeoPackage.BoundingBox(-20037508.342789244, 20037508.342789244, -20037508.342789244, 20037508.342789244)
        const tileMatrixSetSrsId = 3857
        await GeoPackage.createStandardWebMercatorTileTable(gp, geopackageLayerConfig.layerName || geopackageLayerConfig.name, contentsBounds, contentsSrsId, matrixSetBounds, tileMatrixSetSrsId, minZoom, maxZoom)
        let tilesComplete = 0
        let totalSize = 0
        let time = Date.now()
        let currentTile
        await XYZTileUtilities.iterateAllTilesInExtent(aoi, minZoom, maxZoom, async ({z, x, y}) => {
          // console.log(`z: ${z} x: ${x} y: ${y}`)
          let base64 = await layer.renderImageryTile({x, y, z})
          tilesComplete++
          currentTile = {z, x, y}
          // console.log('totalSize', totalSize)
          if (Date.now() - time > 1000) {
            time = Date.now()
            // console.log('GO DISPATCH')
            layerStatus.tilesComplete = tilesComplete
            layerStatus.currentTile = currentTile
            layerStatus.totalSize = totalSize
            layerStatus.remainingTime = ((time - layerStatus.startTime) / layerStatus.tilesComplete) * (layerStatus.totalTileCount - layerStatus.tilesComplete)
            this.dispatchStatusUpdate(status)
          }
          if (!base64) {
            return false
          }
          if (Buffer.isBuffer(base64)) {
            gp.addTile(base64, geopackageLayerConfig.layerName || geopackageLayerConfig.name, z, y, x)
            return false
          }
          if (blankURL === base64) {
            // console.log('IT IS BLANK')
            return false
          }

          let canvas = document.createElement('canvas')
          canvas.width = 256
          canvas.height = 256
          let ctx = canvas.getContext('2d')

          return new Promise((resolve, reject) => {
            let image = new Image()
            image.onload = () => {
              ctx.drawImage(image, 0, 0)
              canvas.toBlob((blob) => {
                let reader = new FileReader()
                reader.addEventListener('loadend', function () {
                  totalSize += reader.result.byteLength
                  // console.log('totalSize', totalSize)
                  gp.addTile(Buffer.from(reader.result), geopackageLayerConfig.layerName || geopackageLayerConfig.name, z, y, x)
                  resolve(false)
                })
                reader.readAsArrayBuffer(blob)
              }, 'image/png', 1.0)
            }
            image.src = base64
          })
        })
        layerStatus.tilesComplete = layerStatus.totalTileCount
        layerStatus.currentTile = currentTile
        layerStatus.totalSize = totalSize
        layerStatus.remainingTime = 0
        layerStatus.creation = 'Completed'
        this.dispatchStatusUpdate(status)
        console.log('completed')
      } catch (error) {
        layerStatus.creation = 'Failed'
        layerStatus.error = error
        this.dispatchStatusUpdate(status)
        console.log('failed')
      }
    }

    // execute imagery to feature configuration
    if (Object.values(this.config.featureToImageryLayers).filter((layer) => {
      return layer.included
    }).length > 0) {
      const layerId = this.config.featureImageryConversion.name
      let aoi = this.config.featureImageryConversion.aoi
      let minZoom = this.config.featureImageryConversion.minZoom
      let maxZoom = this.config.featureImageryConversion.maxZoom
      let layerStatus = {
        layerId,
        totalTileCount: XYZTileUtilities.tileCountInExtent(aoi, minZoom, maxZoom),
        creation: 'Started',
        totalSize: 0,
        remainingTime: 0,
        startTime: Date.now()
      }
      status.layerStatus[layerId] = layerStatus
      this.dispatchStatusUpdate(status)
      try {
        const layerList = Object.keys(this.config.featureToImageryLayers).map((l) => {
          return this.config.featureToImageryLayers[l]
        })
        const layersToInclude = layerList.filter((layer) => {
          return layer.included
        }).map((layer) => {
          return this.project.layers[layer.id]
        })
        // Get Ordered Initialized Layers
        const orderedLayersToInclude = []
        if (this.config.featureImageryConversion.layerOrder) {
          this.config.featureImageryConversion.layerOrder.forEach((l) => {
            const layerConfig = layersToInclude.find((layer) => {
              return layer.name === l.name
            })
            if (layerConfig) {
              orderedLayersToInclude.push(LayerFactory.constructLayer(layerConfig))
            }
          })
        } else {
          layersToInclude.forEach((l) => {
            orderedLayersToInclude.push(LayerFactory.constructLayer(l))
          })
        }

        for (let i = 0; i < orderedLayersToInclude.length; i++) {
          const layer = orderedLayersToInclude[i]
          await layer.initialize()
        }

        // Iterate over each layer and generate dem tiles! Use the style too dawg!
        const contentsBounds = new GeoPackage.BoundingBox(aoi[0][1], aoi[1][1], aoi[0][0], aoi[1][0]).projectBoundingBox('EPSG:4326', 'EPSG:3857')
        const contentsSrsId = 3857
        const matrixSetBounds = new GeoPackage.BoundingBox(-20037508.342789244, 20037508.342789244, -20037508.342789244, 20037508.342789244)
        const tileMatrixSetSrsId = 3857
        await GeoPackage.createStandardWebMercatorTileTable(gp, layerId, contentsBounds, contentsSrsId, matrixSetBounds, tileMatrixSetSrsId, minZoom, maxZoom)
        let tilesComplete = 0
        let totalSize = 0
        let time = Date.now()
        let currentTile
        await XYZTileUtilities.iterateAllTilesInExtent(aoi, minZoom, maxZoom, async ({z, x, y}) => {
          currentTile = {z, x, y}
          let canvas = document.createElement('canvas')
          canvas.width = 256
          canvas.height = 256
          let ctx = canvas.getContext('2d')
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          // iterate over each feature layer and render the x,y,z tile for that feature
          for (let i = 0; i < orderedLayersToInclude.length; i++) {
            await new Promise((resolve, reject) => {
              orderedLayersToInclude[i].renderTile(currentTile, null, (err, buffer) => {
                if (err) {
                  reject(err)
                } else {
                  let img = new Image()
                  img.onload = () => {
                    ctx.drawImage(img, 0, 0)
                    resolve()
                  }
                  img.src = 'data:image/png;base64,' + btoa(String.fromCharCode.apply(null, buffer))
                }
              })
            })
          }
          await new Promise((resolve) => {
            canvas.toBlob((blob) => {
              const reader = new FileReader()
              reader.addEventListener('loadend', function () {
                totalSize += reader.result.byteLength
                gp.addTile(Buffer.from(reader.result), layerId, z, y, x)
                resolve(false)
              })
              reader.readAsArrayBuffer(blob)
            }, 'image/png', 1.0)
          })
          tilesComplete++
          if (Date.now() - time > 1000) {
            time = Date.now()
            layerStatus.tilesComplete = tilesComplete
            layerStatus.currentTile = currentTile
            layerStatus.totalSize = totalSize
            layerStatus.remainingTime = ((time - layerStatus.startTime) / layerStatus.tilesComplete) * (layerStatus.totalTileCount - layerStatus.tilesComplete)
            this.dispatchStatusUpdate(status)
          }
        })
        layerStatus.tilesComplete = layerStatus.totalTileCount
        layerStatus.currentTile = currentTile
        layerStatus.totalSize = totalSize
        layerStatus.remainingTime = 0
        layerStatus.creation = 'Completed'
        this.dispatchStatusUpdate(status)
      } catch (error) {
        layerStatus.creation = 'Failed'
        layerStatus.error = error
        this.dispatchStatusUpdate(status)
      }
    }
    status.creation = 'Completed'
    this.dispatchStatusUpdate(status)
  }
}
