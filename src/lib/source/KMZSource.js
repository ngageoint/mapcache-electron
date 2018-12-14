/* eslint-disable */
import Source from './Source'
import proj4 from 'proj4'
import gdal from 'gdal'
import * as TileBoundingBoxUtils from '../tile/tileBoundingBoxUtils'
import * as geojsonvt from 'geojson-vt'
import * as vtpbf from 'vt-pbf'
import * as Pbf from 'pbf'
import * as VectorTile from '@mapbox/vector-tile'
// eslint-disable-next-line no-unused-vars
import * as Vendor from '../vendor'

export default class KMZSource extends Source {
  async initialize () {
    gdal.verbose()
    let kmzPath = this.configuration.file.path
    console.log('/vsizip/'+kmzPath)
    let dataset = gdal.open('/vsizip/'+kmzPath, 'r', 'KML')
    gdalInfo(dataset)
  }
}

function gdalInfo (ds) {
  console.log('number of bands: ' + ds.bands.count())
  let size = ds.rasterSize
  if (ds.rasterSize) {
    console.log('width: ' + ds.rasterSize.x)
    console.log('height: ' + ds.rasterSize.y)
  }
  let geotransform = ds.geoTransform
  if (geotransform) {
    console.log('Origin = (' + geotransform[0] + ', ' + geotransform[3] + ')')
    console.log('Pixel Size = (' + geotransform[1] + ', ' + geotransform[5] + ')')
    console.log('GeoTransform =')
    console.log(geotransform)
  }

  let layer = ds.layers
  console.log('DataSource Layer Count', layer.count())
  for (var i = 0; i < layer.count(); i++) {
    console.log('Layer %d:', i, layer.get(i))
  }

  console.log('srs: ' + (ds.srs ? ds.srs.toPrettyWKT() : 'null'))
  if (!ds.srs) return
  // corners
  let corners = {
    'Upper Left  ': {x: 0, y: 0},
    'Upper Right ': {x: size.x, y: 0},
    'Bottom Right': {x: size.x, y: size.y},
    'Bottom Left ': {x: 0, y: size.y}
  }

  let wgs84 = gdal.SpatialReference.fromEPSG(4326)
  let coordTransform = new gdal.CoordinateTransformation(ds.srs, wgs84)

  console.log('Corner Coordinates:')
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
    console.log('%s (%d, %d) (%s, %s)',
      cornerName,
      Math.floor(ptOrig.x * 100) / 100,
      Math.floor(ptOrig.y * 100) / 100,
      gdal.decToDMS(ptWgs84.x, 'Long'),
      gdal.decToDMS(ptWgs84.y, 'Lat')
    )
    coordinateCorners.push([ptWgs84.x, ptWgs84.y])
  })

  ds.bands.forEach(function (band) {
    console.log('Band %d Block=%d%d Type=%s, ColorInterp=%s',
      band.id,
      band.blocksize ? band.blocksize.x : 0,
      band.blocksize ? band.blocksize.y : 0,
      band.dataType,
      band.colorInterpretation)

    if (band.description) {
      console.log('  Description = ' + band.description)
    }
    console.log('  Min=' + Math.floor(band.minimum * 1000) / 1000)
    console.log('  Max=' + Math.floor(band.maximum * 1000) / 1000)
    if (band.noDataValue !== null) {
      console.log('  NoData Value=' + band.noDataValue)
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
      console.log('  Overviews: ' + overviewInfo.join(', '))
    }
    if (band.hasArbitraryOverviews) {
      console.log('  Overviews: arbitrary')
    }
    if (band.unitType) {
      console.log('  Unit Type: ' + band.unitType)
    }

    // category names
    let categoryNames = band.categoryNames
    if (categoryNames.length > 0) {
      console.log('  Category Names: ')
      for (var i = 0; i < categoryNames.length; i++) {
        console.log('    ' + i + ': ' + categoryNames[i])
      }
    }

    if (band.scale !== 1 || band.offset !== 0) {
      console.log('  Offset: ' + band.offset + ',   Scale: ' + band.scale)
    }

    // band metadata
    let metadata = band.getMetadata()
    let keys = Object.keys(metadata)
    if (keys.length > 0) {
      console.log('  Metadata:')
      keys.forEach(function (key) {
        console.log('    ' + key + '=' + metadata[key])
      })
    }

    metadata = band.getMetadata('IMAGE_STRUCTURE')
    keys = Object.keys(metadata)
    if (keys.length > 0) {
      console.log('  Image Structure Metadata:')
      keys.forEach(function (key) {
        console.log('    ' + key + '=' + metadata[key])
      })
    }
  })
}
