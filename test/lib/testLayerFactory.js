import * as BrowserMock from './mocks/browser'
import * as LeafletMock from './mocks/leaflet'
import sinon from 'sinon'
import path from 'path'
import jetpack from 'fs-jetpack'
import * as Settings from '../../src/lib/settings/Settings'
import LayerFactory from '../../src/lib/source/layer/LayerFactory'

describe('Layer Factory Tests', function () {
  let sandbox

  before(() => {
    sandbox = sinon.createSandbox()
    sandbox.stub(Settings, 'userDataDir').returns(jetpack.cwd('/tmp'))
  })

  after(() => {
    sandbox.restore()
  })

  it('should construct a geotiff layer from a configuration', async () => {
    let geotiffPath = path.join(__dirname, '..', 'fixtures', 'denver.tif')
    let configuration = {
      filePath: geotiffPath,
      sourceLayerName: 'denver',
      name: 'denver',
      extent:
      [ -104.85255015490993,
        39.64453938508538,
        -104.82331093941556,
        39.67084478892132 ],
      id: '420aecd5-44b8-0602-4848-aa56a7c47089',
      pane: 'tile',
      layerType: 'GeoTIFF',
      overviewTilePath: '/tmp/420aecd5-44b8-0602-4848-aa56a7c47089/420aecd5-44b8-0602-4848-aa56a7c47089/overviewTile.png',
      style: { opacity: 1 },
      srcBands: [ 1, 2, 3 ],
      dstBands: [ 1, 2, 3 ],
      dstAlphaBand: 4,
      photometricInterpretation: 2,
      info: 'width: 2503\nheight: 2924\nOrigin = (512651.296158929, 4391240.16623466)\nPixel Size = (1, -1)\nGeoTransform =\n512651.296158929,1,0,4391240.16623466,0,-1\nDataSource Layer Count 0\nsrs: PROJCS["NAD83 / UTM zone 13N",\n    GEOGCS["NAD83",\n        DATUM["North_American_Datum_1983",\n            SPHEROID["GRS 1980",6378137,298.257222101,\n                AUTHORITY["EPSG","7019"]],\n            TOWGS84[0,0,0,0,0,0,0],\n            AUTHORITY["EPSG","6269"]],\n        PRIMEM["Greenwich",0,\n            AUTHORITY["EPSG","8901"]],\n        UNIT["degree",0.0174532925199433,\n            AUTHORITY["EPSG","9122"]],\n        AUTHORITY["EPSG","4269"]],\n    PROJECTION["Transverse_Mercator"],\n    PARAMETER["latitude_of_origin",0],\n    PARAMETER["central_meridian",-105],\n    PARAMETER["scale_factor",0.9996],\n    PARAMETER["false_easting",500000],\n    PARAMETER["false_northing",0],\n    UNIT["metre",1,\n        AUTHORITY["EPSG","9001"]],\n    AXIS["Easting",EAST],\n    AXIS["Northing",NORTH],\n    AUTHORITY["EPSG","26913"]]\nCorner Coordinates:Upper Left   (512651.29, 4391240.16) (104d51\' 8.98"W,  39d40\'15.19"N)\nUpper Right  (515154.29, 4391240.16) (104d49\'23.92"W,  39d40\'15.04"N)\nBottom Right (515154.29, 4388316.16) (104d49\'24.16"W,  39d38\'40.20"N)\nBottom Left  (512651.29, 4388316.16) (104d51\' 9.18"W,  39d38\'40.34"N)\nBand 1 Block=00 Type=Byte, ColorInterp=Red\n  Min=0\n  Max=255\nBand 2 Block=00 Type=Byte, ColorInterp=Green\n  Min=0\n  Max=255\nBand 3 Block=00 Type=Byte, ColorInterp=Blue\n  Min=0\n  Max=255\n' }
    let layer = LayerFactory.constructLayer(configuration)
    layer.should.exist
    await layer.initialize()
    let config = layer.configuration

    config.filePath.should.be.equal(configuration.filePath)
    config.layerType.should.be.equal(configuration.layerType)
  })
})
