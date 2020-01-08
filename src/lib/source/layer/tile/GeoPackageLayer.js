import TileLayer from './TileLayer'
import GeoPackage, {BoundingBox} from '@ngageoint/geopackage'

export default class GeoPackageLayer extends TileLayer {
  geopackage
  dao

  async initialize () {
    this.geopackage = await GeoPackage.open(this.filePath)
    this.dao = this.geopackage.getTileDao(this.sourceLayerName)
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        extent: this.extent,
        layerType: 'GeoPackage'
      }
    }
  }

  get extent () {
    let contentsDao = this.geopackage.getContentsDao()
    let contents = contentsDao.queryForId(this.sourceLayerName)
    let proj = contentsDao.getProjection(contents)
    console.log(contents)
    console.log(proj)
    let boundingBox = new BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y).projectBoundingBox(proj, 'EPSG:4326')
    return [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
  }

  async renderTile (coords, tileCanvas, done) {
    let {x, y, z} = coords
    if (tileCanvas) {
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
}
