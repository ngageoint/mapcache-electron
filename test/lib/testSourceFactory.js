import * as BrowserMock from './mocks/browser'
import * as LeafletMock from './mocks/leaflet'
import sinon from 'sinon'
import path from 'path'
import jetpack from 'fs-jetpack'
import * as Settings from '../../src/lib/settings/Settings'
import SourceFactory from '../../src/lib/source/SourceFactory'
import GDALSource from '../../src/lib/source/GDALSource'
import GeoTiffLayer from '../../src/lib/source/layer/tile/GeoTiffLayer'

describe('Source Factory Tests', function () {
  let sandbox

  before(() => {
    sandbox = sinon.createSandbox()
    sandbox.stub(Settings, 'userDataDir').returns(jetpack.cwd('/tmp'))
  })

  after(() => {
    sandbox.restore()
  })

  it('should construct a geotiff source from a file', async () => {
    let geotiffPath = path.join(__dirname, '..', 'fixtures', 'denver.tif')
    let geotiffSource = SourceFactory.constructSource(geotiffPath)

    geotiffSource.should.exist

    let layers = await geotiffSource.retrieveLayers()
    layers.length.should.be.equal(1)
    let layer = layers[0]
    await layer.initialize()
    let configuration = layers[0].configuration
    console.log({configuration})
    layers[0].configuration.layerType.should.be.equal('GeoTIFF')
  })

  it('should construct a geopackage source from a file', async () => {
    let geopackagePath = path.join(__dirname, '..', 'fixtures', 'geopackage', 'rivers.gpkg')
    let geopackageSource = SourceFactory.constructSource(geopackagePath)

    geopackageSource.should.exist

    let layers = await geopackageSource.retrieveLayers()
    layers.length.should.be.equal(2)
    let layer = layers[0]
    await layer.initialize()
    let configuration = layer.configuration
    layer.configuration.layerType.should.be.equal('GeoPackage')
  })

  it('should fail on an unknown file type', async () => {
    let geopackagePath = path.join(__dirname, '..', 'fixtures', 'geopackage', 'rivers.nope')
    try {
      let geopackageSource = SourceFactory.constructSource(geopackagePath)
      true.should.be.equal(false)
    } catch (e) {}
  })
})
