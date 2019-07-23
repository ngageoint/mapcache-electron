import jetpack from 'fs-jetpack'
import Layer from '../Layer'
import MapcacheMapLayer from '../../../map/MapcacheMapLayer'
import GeoPackage, {BoundingBox, GeoPackageTileRetriever} from '@ngageoint/geopackage'
import TileBoundingBoxUtils from '../../../tile/tileBoundingBoxUtils'

export default class GeoPackageLayer extends Layer {
  extent
  geopackage
  dao

  async initialize () {
    console.log('opening', this.filePath)
    this.style = this._configuration.style || {
      opacity: 1
    }
    this.geopackage = await GeoPackage.open(this.filePath)
    let contentsDao = this.geopackage.getContentsDao()
    let contents = contentsDao.queryForId(this.sourceLayerName)
    let proj = contentsDao.getProjection(contents)
    let ll = proj.inverse([contents.min_x, contents.min_y])
    let ur = proj.inverse([contents.max_x, contents.max_y])
    let boundingBox = new BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y).projectBoundingBox(proj, 'EPSG:4326')
    this.extent = [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
    let {width, height} = TileBoundingBoxUtils.determineImageDimensionsFromExtent(ll, ur)
    if (this.pane === 'tile') {
      this.dao = this.geopackage.getTileDao(this.sourceLayerName)
      if (!jetpack.exists(this.overviewTilePath)) {
        let retriever = new GeoPackageTileRetriever(this.dao, width, height)
        let targetBoundingBox = new BoundingBox(ll[0], ur[0], ll[1], ur[1])
        let tilePng = await retriever.getTileWithWgs84BoundsInProjection(targetBoundingBox, this.dao.minZoom, 'EPSG:4326')
        console.log('writing file to ', this.overviewTilePath)
        jetpack.write(this.overviewTilePath, Buffer.from(tilePng))
      }
    }
    return this
  }

  async renderTile (coords, tileCanvas, done) {
    return this.renderImageryTile(coords, tileCanvas, done)
  }

  async renderImageryTile (coords, tileCanvas, done) {
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
      shown: this.shown || true
    }
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
