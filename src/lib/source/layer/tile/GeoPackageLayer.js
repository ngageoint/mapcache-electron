import jetpack from 'fs-jetpack'
import TileLayer from './TileLayer'
import GeoPackage, {BoundingBox, GeoPackageTileRetriever} from '@ngageoint/geopackage'
import TileBoundingBoxUtils from '../../../tile/tileBoundingBoxUtils'

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

  async renderOverviewTile () {
    let contentsDao = this.geopackage.getContentsDao()
    let contents = contentsDao.queryForId(this.sourceLayerName)
    let proj = contentsDao.getProjection(contents)
    let ll = proj.inverse([contents.min_x, contents.min_y])
    let ur = proj.inverse([contents.max_x, contents.max_y])
    let {width, height} = TileBoundingBoxUtils.determineImageDimensionsFromExtent(ll, ur)
    if (!jetpack.exists(this.overviewTilePath)) {
      let retriever = new GeoPackageTileRetriever(this.dao, width, height)
      let targetBoundingBox = new BoundingBox(ll[0], ur[0], ll[1], ur[1])
      let tilePng = await retriever.getTileWithWgs84BoundsInProjection(targetBoundingBox, this.dao.minZoom, 'EPSG:4326')
      jetpack.write(this.overviewTilePath, Buffer.from(tilePng))
    }
  }
}
