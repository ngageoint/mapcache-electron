import jetpack from 'fs-jetpack'
import Layer from './Layer'
import MapcacheMapLayer from '../../map/MapcacheMapLayer'
import GeoPackage from '@ngageoint/geopackage'
import TileBoundingBoxUtils from '../../tile/tileBoundingBoxUtils'
import VectorTileRenderer from './renderer/VectorTileRenderer'

export default class GeoPackageLayer extends Layer {
  extent
  geopackage
  dao
  count
  _vectorTileRenderer

  async initialize () {
    console.log('opening', this.filePath)
    this.geopackage = await GeoPackage.open(this.filePath)
    let contentsDao = this.geopackage.getContentsDao()
    let contents = contentsDao.queryForId(this.sourceLayerName)

    let proj = contentsDao.getProjection(contents)
    let ll = proj.inverse([contents.min_x, contents.min_y])
    let ur = proj.inverse([contents.max_x, contents.max_y])
    this.extent = [ll[0], ll[1], ur[0], ur[1]]
    let {width, height} = TileBoundingBoxUtils.determineImageDimensionsFromExtent(ll, ur)
    let coords = TileBoundingBoxUtils.determineXYZTileInsideExtent([this.extent[0], this.extent[1]], [this.extent[2], this.extent[3]])
    if (this.pane === 'tile') {
      this.dao = this.geopackage.getTileDao(this.sourceLayerName)
      if (!jetpack.exists(this.overviewTilePath)) {
        let retriever = new GeoPackage.GeoPackageTileRetriever(this.dao, width, height)
        let targetBoundingBox = new GeoPackage.BoundingBox(ll[0], ur[0], ll[1], ur[1])
        let tilePng = await retriever.getTileWithWgs84BoundsInProjection(targetBoundingBox, this.dao.minZoom, 'EPSG:4326')
        console.log('writing file to ', this.overviewTilePath)
        jetpack.write(this.overviewTilePath, Buffer.from(tilePng))
      }
    } else if (this.pane === 'vector') {
      this.dao = this.geopackage.getFeatureDao(this.sourceLayerName)
      let gp = this.geopackage
      let tableName = this.sourceLayerName
      this._vectorTileRenderer = new VectorTileRenderer(this.style, this.name, (x, y, z) => {
        return GeoPackage.getVectorTileProtobuf(gp, tableName, x, y, z)
      })

      await this._vectorTileRenderer.init()
      await this.renderOverviewTile(coords)
    }
    this.count = this.dao.count()
    return this
  }

  async renderTile (coords, tileCanvas, done) {
    if (this.pane === 'vector') {
      return this.renderVectorTile(coords, tileCanvas, done)
    } else {
      return this.renderImageryTile(coords, tileCanvas, done)
    }
  }

  async renderImageryTile (coords, tileCanvas, done) {
    let {x, y, z} = coords
    if (tileCanvas) {
      console.log('tile Canvas is', tileCanvas)
      await GeoPackage.drawXYZTileInCanvas(this.geopackage, this.sourceLayerName, x, y, z, tileCanvas.width, tileCanvas.height, tileCanvas)
      if (done) {
        done(null, tileCanvas)
      }
      return tileCanvas
    } else {
      let image = await GeoPackage.getTileFromXYZ(this.geopackage, this.sourceLayerName, x, y, z, 256, 256)
      if (done) {
        done(null, image)
      }
      return image
    }
  }

  async renderVectorTile (coords, tileCanvas, done) {
    return this._vectorTileRenderer.renderVectorTile(coords, tileCanvas, done)
  }

  renderOverviewTile (coords) {
    let overviewTilePath = this.overviewTilePath
    this.renderTile(coords, null, function (err, imageData) {
      if (err) throw err
      jetpack.write(overviewTilePath, imageData)
    })
  }

  getLayerColumns () {
    let columns = {
      columns: []
    }
    let geomColumn = this.dao.getTable().getGeometryColumn()
    columns.geom = {
      name: geomColumn.name
    }
    let idColumn = this.dao.getTable().getIdColumn()
    columns.id = {
      name: idColumn.name,
      dataType: GeoPackage.DataTypes.name(idColumn.dataType)
    }
    for (const column of this.dao.getTable().columns) {
      if (column.name !== columns.id.name && column.name !== columns.geom.name) {
        let c = {
          dataType: GeoPackage.DataTypes.name(column.dataType),
          name: column.name,
          max: column.max,
          notNull: column.notNull,
          defaultValue: column.defaultValue
        }
        columns.columns.push(c)
      }
    }
    return columns
  }

  iterateFeaturesInBounds (bounds) {
    let bb = new GeoPackage.BoundingBox(bounds[0][1], bounds[1][1], bounds[0][0], bounds[1][0])
    return this.dao.queryForGeoJSONIndexedFeaturesWithBoundingBox(bb)
  }

  get configuration () {
    return {
      filePath: this.filePath,
      sourceLayerName: this.sourceLayerName,
      name: this.name,
      id: this.id,
      extent: this.extent,
      pane: this.pane,
      layerType: 'GeoPackage',
      overviewTilePath: this.overviewTilePath,
      style: this.style,
      count: this.count,
      shown: this.shown || true
    }
  }

  get style () {
    this._style = this._style || {
      weight: 2,
      radius: 2,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      opacity: 1,
      fillColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
      fillOpacity: 0.5,
      fill: false
    }
    return this._style
  }

  get mapLayer () {
    if (this._mapLayer) return this._mapLayer

    this._mapLayer = new MapcacheMapLayer({
      layer: this,
      pane: this.pane === 'tile' ? 'tilePane' : 'overlayPane'
    })

    this._mapLayer.id = this.id
    return this._mapLayer
  }
}
