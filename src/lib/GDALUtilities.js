import gdal from 'gdal'
export default class GDALUtilities {
  static translateToGeoTiff = (srcFile, dstFile, extent) => {
    let success = true
    try {
      let srcDataset = gdal.open(srcFile)
      let driver = gdal.drivers.get('GTiff')
      let copyDataset = driver.createCopy(dstFile, srcDataset, {})
      copyDataset.srs = gdal.SpatialReference.fromProj4('+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs')
      const pixelSize = Math.min((extent[2] - extent[0]) / srcDataset.rasterSize.x, (extent[3] - extent[1]) / srcDataset.rasterSize.y)
      copyDataset.geoTransform = [extent[0], pixelSize, 0, extent[3], 0, -pixelSize]
      copyDataset.flush()
      srcDataset.close()
      copyDataset.close()
    } catch (error) {
      success = false
      console.log(error)
    }
    return success
  }
}
