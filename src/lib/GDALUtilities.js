import geotiff from 'geotiff'
import * as GeoTIFFGlobals from 'geotiff/src/globals'

export default class GDALUtilities {
  // static translateToGeoTiff = (srcFile, dstFile, extent) => {
  //   let success = true
  //   try {
  //     let srcDataset = gdal.open(srcFile)
  //     let driver = gdal.drivers.get('GTiff')
  //     let copyDataset = driver.createCopy(dstFile, srcDataset)
  //     copyDataset.srs = gdal.SpatialReference.fromProj4('+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs')
  //
  //     let tr = {
  //       x: Math.max(extent[2] - extent[0]) / srcDataset.rasterSize.x,
  //       y: Math.max(extent[3] - extent[1]) / srcDataset.rasterSize.y
  //     }
  //     copyDataset.geoTransform = [
  //       extent[0], tr.x, 0,
  //       extent[3], 0, -tr.y
  //     ]
  //
  //     copyDataset.flush()
  //     srcDataset.close()
  //     copyDataset.close()
  //   } catch (error) {
  //     success = false
  //     // eslint-disable-next-line no-console
  //     console.error(error)
  //   }
  //   return success
  // }

  // static sourceCorners (ds) {
  //   let size = ds.rasterSize
  //   let geotransform = ds.geoTransform
  //
  //   // corners
  //   let corners = {
  //     'Upper Left  ': {x: 0, y: 0},
  //     'Upper Right ': {x: size.x, y: 0},
  //     'Bottom Right': {x: size.x, y: size.y},
  //     'Bottom Left ': {x: 0, y: size.y}
  //   }
  //
  //   let wgs84 = gdal.SpatialReference.fromProj4('+init=epsg:4326')
  //   let coordTransform = new gdal.CoordinateTransformation(ds.srs, wgs84)
  //
  //   let cornerNames = Object.keys(corners)
  //
  //   let coordinateCorners = []
  //
  //   cornerNames.forEach(function (cornerName) {
  //     // convert pixel x,y to the coordinate system of the raster
  //     // then transform it to WGS84
  //     let corner = corners[cornerName]
  //     let ptOrig = {
  //       x: geotransform[0] + corner.x * geotransform[1] + corner.y * geotransform[2],
  //       y: geotransform[3] + corner.x * geotransform[4] + corner.y * geotransform[5]
  //     }
  //     let ptWgs84 = coordTransform.transformPoint(ptOrig)
  //     coordinateCorners.push([ptWgs84.x, ptWgs84.y])
  //   })
  //
  //   coordinateCorners.push([coordinateCorners[0][0], coordinateCorners[0][1]])
  //   return coordinateCorners
  // }

  // /**
  //  * Determine Web Mercator Zoom Level for a geotiff dataset (opened using node-gdal).
  //  * @param ds
  //  * @returns {number}
  //  */
  // static getWebMercatorZoomLevelForGeoTIFF (ds) {
  //   let size = ds.rasterSize
  //   let geotransform = ds.geoTransform
  //   let wgs84 = gdal.SpatialReference.fromProj4('+init=epsg:4326')
  //   let coordTransform = new gdal.CoordinateTransformation(ds.srs, wgs84)
  //   let uLWgs84 = coordTransform.transformPoint({
  //     x: geotransform[0],
  //     y: geotransform[3]
  //   })
  //   let uRWgs84 = coordTransform.transformPoint({
  //     x: geotransform[0] + size.x * geotransform[1],
  //     y: geotransform[3] + size.x * geotransform[4]
  //   })
  //   const pixelWidthInDeg = (uRWgs84.x - uLWgs84.x) / ds.rasterSize.x
  //   const tileWidthInDeg = 256.0 * pixelWidthInDeg
  //   return Math.ceil(Math.log(360.0 / tileWidthInDeg) / Math.log(2))
  // }
}
