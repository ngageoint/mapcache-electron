import gdal from 'gdal'
import * as GeoTIFFGlobals from 'geotiff/src/globals'

export default class GDALUtilities {
  static translateToGeoTiff = (srcFile, dstFile, extent) => {
    let success = true
    try {
      let srcDataset = gdal.open(srcFile)
      let driver = gdal.drivers.get('GTiff')
      let copyDataset = driver.createCopy(dstFile, srcDataset)
      copyDataset.srs = gdal.SpatialReference.fromProj4('+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs')

      let tr = {
        x: Math.max(extent[2] - extent[0]) / srcDataset.rasterSize.x,
        y: Math.max(extent[3] - extent[1]) / srcDataset.rasterSize.y
      }
      copyDataset.geoTransform = [
        extent[0], tr.x, 0,
        extent[3], 0, -tr.y
      ]

      copyDataset.flush()
      srcDataset.close()
      copyDataset.close()
    } catch (error) {
      success = false
      // eslint-disable-next-line no-console
      console.error(error)
    }
    return success
  }

  static sourceCorners (ds) {
    let size = ds.rasterSize
    let geotransform = ds.geoTransform

    // corners
    let corners = {
      'Upper Left  ': {x: 0, y: 0},
      'Upper Right ': {x: size.x, y: 0},
      'Bottom Right': {x: size.x, y: size.y},
      'Bottom Left ': {x: 0, y: size.y}
    }

    let wgs84 = gdal.SpatialReference.fromProj4('+init=epsg:4326')
    let coordTransform = new gdal.CoordinateTransformation(ds.srs, wgs84)

    let cornerNames = Object.keys(corners)

    let coordinateCorners = []

    cornerNames.forEach(function (cornerName) {
      // convert pixel x,y to the coordinate system of the raster
      // then transform it to WGS84
      let corner = corners[cornerName]
      let ptOrig = {
        x: geotransform[0] + corner.x * geotransform[1] + corner.y * geotransform[2],
        y: geotransform[3] + corner.x * geotransform[4] + corner.y * geotransform[5]
      }
      let ptWgs84 = coordTransform.transformPoint(ptOrig)
      coordinateCorners.push([ptWgs84.x, ptWgs84.y])
    })

    coordinateCorners.push([coordinateCorners[0][0], coordinateCorners[0][1]])
    return coordinateCorners
  }

  /**
   * Determine Web Mercator Zoom Level for a geotiff dataset (opened using node-gdal).
   * @param ds
   * @returns {number}
   */
  static getWebMercatorZoomLevelForGeoTIFF (ds) {
    let size = ds.rasterSize
    let geotransform = ds.geoTransform
    let wgs84 = gdal.SpatialReference.fromProj4('+init=epsg:4326')
    let coordTransform = new gdal.CoordinateTransformation(ds.srs, wgs84)
    let uLWgs84 = coordTransform.transformPoint({
      x: geotransform[0],
      y: geotransform[3]
    })
    let uRWgs84 = coordTransform.transformPoint({
      x: geotransform[0] + size.x * geotransform[1],
      y: geotransform[3] + size.x * geotransform[4]
    })
    const pixelWidthInDeg = (uRWgs84.x - uLWgs84.x) / ds.rasterSize.x
    const tileWidthInDeg = 256.0 * pixelWidthInDeg
    return Math.ceil(Math.log(360.0 / tileWidthInDeg) / Math.log(2))
  }

  static gdalInfo (ds, image) {
    let info = ''
    let size = ds.rasterSize
    if (ds.rasterSize) {
      info += 'width: ' + ds.rasterSize.x + '\n'
      info += 'height: ' + ds.rasterSize.y + '\n'
    }
    let geotransform = ds.geoTransform
    if (geotransform) {
      info += 'Origin = (' + geotransform[0] + ', ' + geotransform[3] + ')\n'
      info += 'Pixel Size = (' + geotransform[1] + ', ' + geotransform[5] + ')\n'
      info += 'GeoTransform =\n'
      info += geotransform + '\n'
    }

    let layer = ds.layers
    info += 'DataSource Layer Count ' + layer.count() + '\n'
    for (let i = 0; i < layer.count(); i++) {
      info += 'Layer ' + i + ': ' + layer.get(i) + '\n'
    }

    if (image) {
      info += 'FileDirectory\n'
      for (let key in image.fileDirectory) {
        let varName = key.charAt(0).toLowerCase() + key.slice(1) + 's'
        let globals = GeoTIFFGlobals[varName]
        if (globals) {
          for (const globalKey in globals) {
            let globalValue = globals[globalKey]
            if (globalValue === image.fileDirectory[key]) {
              info += '\t' + key + ': ' + globalKey + ' (' + image.fileDirectory[key] + ')\n'
            }
          }
        } else if (key !== 'StripOffsets' && key !== 'StripByteCounts') {
          info += '\t' + key + ': ' + image.fileDirectory[key] + '\n'
        }
        // JSON.stringify(image.fileDirectory, null, 2)
      }
    }

    info += 'srs: ' + (ds.srs ? ds.srs.toPrettyWKT() : 'null') + '\n'
    if (!ds.srs) return info
    // corners
    let corners = {
      'Upper Left  ': {x: 0, y: 0},
      'Upper Right ': {x: size.x, y: 0},
      'Bottom Right': {x: size.x, y: size.y},
      'Bottom Left ': {x: 0, y: size.y}
    }

    let wgs84 = gdal.SpatialReference.fromProj4('+init=epsg:4326')
    let coordTransform = new gdal.CoordinateTransformation(ds.srs, wgs84)

    info += 'Corner Coordinates:'
    let cornerNames = Object.keys(corners)

    let coordinateCorners = []

    cornerNames.forEach(function (cornerName) {
      // convert pixel x,y to the coordinate system of the raster
      // then transform it to WGS84
      let corner = corners[cornerName]
      let ptOrig = {
        x: geotransform[0] + corner.x * geotransform[1] + corner.y * geotransform[2],
        y: geotransform[3] + corner.x * geotransform[4] + corner.y * geotransform[5]
      }
      let ptWgs84 = coordTransform.transformPoint(ptOrig)
      info += `${cornerName} (${Math.floor(ptOrig.x * 100) / 100}, ${Math.floor(ptOrig.y * 100) / 100}) (${gdal.decToDMS(ptWgs84.x, 'Long')}, ${gdal.decToDMS(ptWgs84.y, 'Lat')})\n`
      coordinateCorners.push([ptWgs84.x, ptWgs84.y])
    })

    ds.bands.forEach(function (band) {
      info += `Band ${band.id} Block=${band.blocksize ? band.blocksize.x : 0}${band.blocksize ? band.blocksize.y : 0} Type=${band.dataType}, ColorInterp=${band.colorInterpretation}\n`

      if (band.description) {
        info += '  Description = ' + band.description + '\n'
      }
      info += '  Min=' + Math.floor(band.minimum * 1000) / 1000 + '\n'
      info += '  Max=' + Math.floor(band.maximum * 1000) / 1000 + '\n'
      if (band.noDataValue !== null) {
        info += '  NoData Value=' + band.noDataValue + '\n'
      }

      // band overviews
      let overviewInfo = []
      band.overviews.forEach(function (overview) {
        let overviewDescription = overview.size.x + 'x' + overview.size.y

        let metadata = overview.getMetadata()
        if (metadata['RESAMPLING'] === 'AVERAGE_BIT2') {
          overviewDescription += '*'
        }

        overviewInfo.push(overviewDescription)
      })

      if (overviewInfo.length > 0) {
        info += '  Overviews: ' + overviewInfo.join(', ') + '\n'
      }
      if (band.hasArbitraryOverviews) {
        info += '  Overviews: arbitrary' + '\n'
      }
      if (band.unitType) {
        info += '  Unit Type: ' + band.unitType + '\n'
      }

      // category names
      let categoryNames = band.categoryNames
      if (categoryNames.length > 0) {
        info += '  Category Names: ' + '\n'
        for (var i = 0; i < categoryNames.length; i++) {
          info += '    ' + i + ': ' + categoryNames[i] + '\n'
        }
      }

      if (band.scale !== 1 || band.offset !== 0) {
        info += '  Offset: ' + band.offset + ',   Scale: ' + band.scale + '\n'
      }

      // band metadata
      let metadata = band.getMetadata()
      let keys = Object.keys(metadata)
      if (keys.length > 0) {
        info += '  Metadata:' + '\n'
        keys.forEach(function (key) {
          info += '    ' + key + '=' + metadata[key] + '\n'
        })
      }

      metadata = band.getMetadata('IMAGE_STRUCTURE')
      keys = Object.keys(metadata)
      if (keys.length > 0) {
        info += '  Image Structure Metadata:' + '\n'
        keys.forEach(function (key) {
          info += '    ' + key + '=' + metadata[key] + '\n'
        })
      }
    })
    return info
  }
}
