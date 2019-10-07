import Source from './Source'
import gdal from 'gdal'
import GDALVectorLayer from './layer/vector/GDALVectorLayer'
import GeoTiffLayer from './layer/tile/GeoTiffLayer'

export default class GDALSource extends Source {
  constructor (filePath, sourceId, geopackageFileName = null) {
    super(filePath, sourceId)
    // verify this can be opened
    gdal.config.set('OGR_ENABLE_PARTIAL_REPROJECTION', 'YES')
    this.dataset = gdal.open(this.filePath, 'r')
    this.dataset.close()
    this.geopackageFileName = geopackageFileName
  }

  async retrieveLayers () {
    gdal.config.set('OGR_ENABLE_PARTIAL_REPROJECTION', 'YES')
    this.dataset = gdal.open(this.filePath, 'r') //, 'KMLSUPEROVERLAY')
    this.layers = []
    this.dataset.layers.forEach((layer, index) => {
      this.layers.push(new GDALVectorLayer({filePath: this.filePath, sourceLayerName: layer.name, shown: true, geopackageFileName: this.geopackageFileName, style: this.style}))
    })
    if (this.dataset.driver.description === 'GTiff') {
      this.layers.push(new GeoTiffLayer({filePath: this.filePath, shown: true}))
    }
    this.dataset.close()
    return this.layers
  }
}
