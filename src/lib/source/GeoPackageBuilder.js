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
    console.log('DISPATCHING')
    store.dispatch('Projects/setGeoPackageStatus', {
      projectId: this.project.id,
      geopackageId: this.config.id,
      status
    })
  }

  async go () {
    var blankCanvas = document.createElement('canvas')
    blankCanvas.width = 256
    blankCanvas.height = 256
    let blankURL = blankCanvas.toDataURL()

    // var canvas = document.getElementById('editor'),
    //     ctx = canvas.getContext('2d'),
    //     blankURL = document.getElementById('blank').toDataURL();
    //
    // canvas.addEventListener('mousemove', function(e){
    //     ctx.lineTo(e.pageX, e.pageY);
    //     ctx.stroke();
    // }, false);
    //
    // document.getElementById('save').addEventListener('click', function(){
    //     if(canvas.toDataURL() === blankURL){
    //         alert('It is blank');
    //     }
    //     else{
    //         alert('Save it!');
    //     }
    // }, false);

    let status = {
      creation: 'Started',
      layerStatus: {}
    }
    this.dispatchStatusUpdate(status)
    console.log('GO CREATE IT')
    let gp = await GeoPackage.create(this.config.fileName)
    for (const layerId in this.config.featureLayers) {
      let geopackageLayerConfig = this.config.featureLayers[layerId]
      console.log('layerId', layerId)
      console.log('GP Layer Config', geopackageLayerConfig)
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
          console.log('Pushing column', column)
          console.log('data type', GeoPackage.DataTypes.fromName(column.dataType))
          columns.push(FeatureColumn.createColumnWithIndex(columnCount++, column.name, GeoPackage.DataTypes.fromName(column.dataType), column.notNull, column.defaultValue))
        }
      }
      let bb = new GeoPackage.BoundingBox(aoi[0][1], aoi[1][1], aoi[0][0], aoi[1][0])
      await gp.createFeatureTableWithGeometryColumns(geometryColumns, bb, 4326, columns)
      let iterator = await layer.iterateFeaturesInBounds(aoi)
      for (let feature of iterator) {
        console.log('adding feature', feature)
        GeoPackage.addGeoJSONFeatureToGeoPackage(gp, feature, geopackageLayerConfig.layerName || geopackageLayerConfig.name)
        layerStatus.featuresAdded++
        if (layerStatus.featuresAdded % 10 === 0) {
          this.dispatchStatusUpdate(status)
        }
      }
    }
    for (const layerId in this.config.imageryLayers) {
      let geopackageLayerConfig = this.config.imageryLayers[layerId]
      console.log('layerId', layerId)
      console.log('GP Layer Config', geopackageLayerConfig)
      if (!geopackageLayerConfig.included) {
        continue
      }

      let aoi = this.config.imageryLayersShareBounds ? this.config.imageryAoi : geopackageLayerConfig.aoi
      let minZoom = Number(this.config.imageryLayersShareBounds ? this.config.minZoom : geopackageLayerConfig.minZoom)
      let maxZoom = Number(this.config.imageryLayersShareBounds ? this.config.maxZoom : geopackageLayerConfig.maxZoom)
      let layerConfig = this.project.layers[layerId]
      console.log('aoi', aoi)
      console.log('minZoom', minZoom)
      console.log('maxZoom', maxZoom)
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

      let layer = LayerFactory.constructLayer(layerConfig)
      await layer.initialize()
      console.log('Tile Layer')
      const contentsBounds = new GeoPackage.BoundingBox(aoi[0][1], aoi[1][1], aoi[0][0], aoi[1][0]).projectBoundingBox('EPSG:4326', 'EPSG:3857')
      const contentsSrsId = 3857
      const matrixSetBounds = new GeoPackage.BoundingBox(-20037508.342789244, 20037508.342789244, -20037508.342789244, 20037508.342789244)
      const tileMatrixSetSrsId = 3857
      await GeoPackage.createStandardWebMercatorTileTable(gp, geopackageLayerConfig.layerName || geopackageLayerConfig.name, contentsBounds, contentsSrsId, matrixSetBounds, tileMatrixSetSrsId, minZoom, maxZoom)
      let tilesComplete = 0
      let totalSize = 0
      let time = Date.now()
      let currentTile
      let done = await XYZTileUtilities.iterateAllTilesInExtent(aoi, minZoom, maxZoom, async ({z, x, y}) => {
        console.log(`z: ${z} x: ${x} y: ${y}`)
        let base64 = await layer.renderImageryTile({x, y, z})
        tilesComplete++
        currentTile = {z, x, y}
        console.log('totalSize', totalSize)
        if (Date.now() - time > 1000) {
          time = Date.now()
          console.log('GO DISPATCH')
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
          console.log('IT IS BLANK')
          return false
        }

        var canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        var ctx = canvas.getContext('2d')

        return new Promise((resolve, reject) => {
          var image = new Image()

          image.onload = () => {
            ctx.drawImage(image, 0, 0)
            canvas.toBlob((blob) => {
              var reader = new FileReader()
              reader.addEventListener('loadend', function () {
                totalSize += reader.result.byteLength
                console.log('totalSize', totalSize)
                gp.addTile(Buffer.from(reader.result), geopackageLayerConfig.layerName || geopackageLayerConfig.name, z, y, x)
                resolve(false)
              })
              reader.readAsArrayBuffer(blob)
            }, 'image/jpeg', 0.80)
          }
          image.src = base64
        })
      })
      layerStatus.tilesComplete = layerStatus.totalTileCount
      layerStatus.currentTile = currentTile
      layerStatus.totalSize = totalSize
      layerStatus.remainingTime = 0
      this.dispatchStatusUpdate(status)
      console.log('done', done)
    }
  }
}
