import { GeoPackageAPI, BoundingBox } from '@ngageoint/geopackage'
import TileLayer from './TileLayer'
import LayerTypes from '../LayerTypes'

export default class GeoPackageTileLayer extends TileLayer {
  geopackage

  async initialize () {
    this.geopackage = await GeoPackageAPI.open(this.filePath)
    const dao = this.geopackage.getTileDao(this.sourceLayerName)
    this.minZoom = dao.minZoom
    this.maxZoom = dao.maxZoom
    await super.initialize()
    return this
  }

  update (configuration) {
    super.update(configuration)
  }

  setRenderer (renderer) {
    this.renderer = renderer
    this.renderer.setGeoPackage(this.geopackage)
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        extent: this.extent,
        layerType: LayerTypes.GEOPACKAGE,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom
      }
    }
  }

  get extent () {
    let contentsDao = this.geopackage.contentsDao
    let contents = contentsDao.queryForId(this.sourceLayerName)
    let proj = contentsDao.getProjection(contents)
    let boundingBox = new BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y).projectBoundingBox(proj, 'EPSG:4326')
    return [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
  }

  close () {
    if (this.geopackage) {
      try {
        this.geopackage.close()
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
      }
      this.geopackage = undefined
      if (this.renderer) {
        this.renderer.setGeoPackage(null)
      }
    }
  }
}
