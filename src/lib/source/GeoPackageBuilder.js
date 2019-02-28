import GeoPackage from '@ngageoint/geopackage'
import LayerFactory from './layer/LayerFactory'
import XYZTileUtilities from '../XYZTileUtilities'

export default class GeoPackageBuilder {
  config
  project

  constructor (config, project) {
    this.config = config
    this.project = project
  }

  async go () {
    console.log('GO CREATE IT')
    let gp = await GeoPackage.create(this.config.fileName)
    for (const layerId of this.config.layers) {
      console.log('layerId', layerId)
      let layerConfig = this.project.layers[layerId]
      let layer = LayerFactory.constructLayer(layerConfig)
      await layer.initialize()
      if (layerConfig.pane === 'vector') {
        console.log('Vector Layer')
        // get the vectors in the bounds
        let layerColumns = layer.getLayerColumns()
        const FeatureColumn = GeoPackage.FeatureColumn
        let geometryColumns = new GeoPackage.GeometryColumns()
        geometryColumns.table_name = layerConfig.name
        geometryColumns.column_name = layerColumns.geom.name
        geometryColumns.geometry_type_name = 'GEOMETRYCOLLECTION'
        geometryColumns.z = 0
        geometryColumns.m = 0

        let columns = []
        columns.push(FeatureColumn.createPrimaryKeyColumnWithIndexAndName(0, layerColumns.id.name))
        columns.push(FeatureColumn.createGeometryColumn(1, layerColumns.geom.name, 'GEOMETRYCOLLECTION', false, null))
        let columnCount = 2
        for (const column of layerColumns.columns) {
          columns.push(FeatureColumn.createColumnWithIndex(columnCount++, column.name, GeoPackage.DataTypes.fromName(column.dataType), column.notNull, column.defaultValue))
        }
        let bb = new GeoPackage.BoundingBox(this.config.aoi[0][1], this.config.aoi[1][1], this.config.aoi[0][0], this.config.aoi[1][0])
        await gp.createFeatureTableWithGeometryColumns(geometryColumns, bb, 4326, columns)
        let iterator = await layer.iterateFeaturesInBounds(this.config.aoi)
        for (let feature of iterator) {
          GeoPackage.addGeoJSONFeatureToGeoPackage(gp, feature, layerConfig.name)
        }
      } else if (layerConfig.pane === 'tile') {
        console.log('Tile Layer')
        const contentsBounds = new GeoPackage.BoundingBox(-20037508.342789244, 20037508.342789244, -20037508.342789244, 20037508.342789244)
        const contentsSrsId = 3857
        const matrixSetBounds = new GeoPackage.BoundingBox(-20037508.342789244, 20037508.342789244, -20037508.342789244, 20037508.342789244)
        const tileMatrixSetSrsId = 3857
        await GeoPackage.createStandardWebMercatorTileTable(gp, layerConfig.name, contentsBounds, contentsSrsId, matrixSetBounds, tileMatrixSetSrsId, this.config.minZoom, this.config.maxZoom)
        let done = await XYZTileUtilities.iterateAllTilesInExtent(this.config.aoi, this.config.minZoom, this.config.maxZoom, async ({z, x, y}) => {
          console.log(`z: ${z} x: ${x} y: ${y}`)
          let base64 = await layer.renderImageryTile({x, y, z})
          if (!base64) {
            return false
          }
          if (Buffer.isBuffer(base64)) {
            gp.addTile(base64, layerConfig.name, z, y, x)
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
                  gp.addTile(Buffer.from(reader.result), layerConfig.name, z, y, x)
                  resolve(false)
                })
                reader.readAsArrayBuffer(blob)
              })
            }
            image.src = base64
          })
        })
        console.log('done', done)
      }
    }
  }
}
