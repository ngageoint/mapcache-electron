import TileLayer from './TileLayer'
import GeoPackage from '@ngageoint/geopackage'
import PureImage from 'pureimage'
import {Duplex} from 'stream'

export default class GeoPackageFeatureTileLayer extends TileLayer {
  geopackage

  async initialize () {
    this.geopackage = await GeoPackage.open(this.filePath)
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        extent: this.extent,
        layerType: 'GeoPackageFeatureTile'
      }
    }
  }

  get extent () {
    if (!this._extent) {
      let contentsDao = this.geopackage.getContentsDao()
      let contents = contentsDao.queryForId(this.sourceLayerName)
      let proj = contentsDao.getProjection(contents)
      let boundingBox = new GeoPackage.BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y).projectBoundingBox(proj, 'EPSG:4326')
      this._extent = [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
    }
    return this._extent
  }

  async renderTile (coords, tileCanvas, done) {
    let {x, y, z} = coords
    if (tileCanvas) {
      let image = await GeoPackage.getFeatureTileFromXYZ(this.geopackage, this.sourceLayerName, x, y, z, tileCanvas.width, tileCanvas.height)
      let stream = new Duplex()
      stream.push(image)
      stream.push(null)
      let bitmap = await PureImage.decodePNGFromStream(stream)

      const imageData = tileCanvas.getContext('2d').createImageData(bitmap.width, bitmap.height)
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = bitmap.data[i]
        imageData.data[i + 1] = bitmap.data[i + 1]
        imageData.data[i + 2] = bitmap.data[i + 2]
        imageData.data[i + 3] = bitmap.data[i + 3]
      }
      var imageBitmap = await createImageBitmap(imageData)

      tileCanvas.getContext('2d').drawImage(imageBitmap,
        0,
        0,
        tileCanvas.width,
        tileCanvas.height,
        0,
        0,
        tileCanvas.width,
        tileCanvas.height
      )

      if (done) {
        done(null, tileCanvas)
      }
      return tileCanvas
    } else {
      let image = await GeoPackage.getFeatureTileFromXYZ(this.geopackage, this.sourceLayerName, x, y, z, 256, 256)
      if (done) {
        done(null, image)
      }
      return image
    }
  }

  async renderOverviewTile () {
  }
}
