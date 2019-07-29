import VectorLayer from './VectorLayer'
import GeoPackage, {BoundingBox, DataTypes} from '@ngageoint/geopackage'

export default class GeoPackageVectorLayer extends VectorLayer {
  _geopackage
  _dao
  _features

  async initialize () {
    this._geopackage = await GeoPackage.open(this.filePath)
    this._dao = this._geopackage.getFeatureDao(this.sourceLayerName)
    this._features = (await GeoPackage.getGeoJSONFeaturesInTile(this._geopackage, this.sourceLayerName, 0, 0, 0, true)).map(f => {
      // feature's type not set, workaround
      f.type = 'Feature'
      return f
    })

    await super.initialize()
    return this
  }

  get extent () {
    if (!this._extent) {
      let contentsDao = this._geopackage.getContentsDao()
      let contents = contentsDao.queryForId(this.sourceLayerName)
      let proj = contentsDao.getProjection(contents)
      let boundingBox = new GeoPackage.BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y).projectBoundingBox(proj, 'EPSG:4326')
      this._extent = [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
    }
    return this._extent
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: 'GeoPackageVector'
      }
    }
  }

  get featureCollection () {
    return {
      type: 'FeatureCollection',
      features: this._features
    }
  }

  /**
   * Overwrite getLayerColumns
   * @returns {{columns: Array}}
   */
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
      dataType: DataTypes.name(idColumn.dataType)
    }
    for (const column of this.dao.getTable().columns) {
      if (column.name !== columns.id.name && column.name !== columns.geom.name) {
        let c = {
          dataType: DataTypes.name(column.dataType),
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

  /**
   * Overwrite iterateFeaturesInBounds
   * @param bounds
   * @returns {{next, [Symbol.iterator]}}
   */
  iterateFeaturesInBounds (bounds) {
    let bb = new BoundingBox(bounds[0][1], bounds[1][1], bounds[0][0], bounds[1][0])
    return this.dao.queryForGeoJSONIndexedFeaturesWithBoundingBox(bb)
  }
}
