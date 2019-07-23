import * as BrowserMock from './mocks/browser'
import * as LeafletMock from './mocks/leaflet'
import sinon from 'sinon'
import path from 'path'
import jetpack from 'fs-jetpack'
import * as Settings from '../../src/lib/settings/Settings'
import GeoPackageSource from '../../src/lib/source/GeoPackageSource'
import GeoPackageLayer from '../../src/lib/source/layer/tile/GeoPackageLayer'

describe('GeoPackage Source Tests', function () {
  let sandbox

  before(() => {
    sandbox = sinon.createSandbox()
    sandbox.stub(Settings, 'userDataDir').returns(jetpack.cwd('/tmp'))
  })

  after(() => {
    sandbox.restore()
  })

  it('should construct a new GeoPackage source and initialize the layers', async () => {
    let geoPackagePath = path.join(__dirname, '..', 'fixtures', 'geopackage', 'rivers.gpkg')
    let source = new GeoPackageSource(geoPackagePath, 'id')
    source.filePath.should.be.equal(geoPackagePath)
    source.sourceId.should.be.equal('id')
    let layers = await source.retrieveLayers()
    layers.length.should.be.equal(2)

    await layers[0].initialize()
    let layer = layers[0]
    layer.filePath.should.be.equal(geoPackagePath)
    layer.name.should.be.equal('TILESosmds')
    layer.sourceLayerName.should.be.equal('TILESosmds')
    let configuration = layer.configuration
    configuration.sourceLayerName.should.be.equal('TILESosmds')
    configuration.count.should.be.equal(85)
    configuration.pane.should.be.equal('tile')
    configuration.style.should.exist

    await layers[1].initialize()
    layer = layers[1]
    layer.filePath.should.be.equal(geoPackagePath)
    layer.name.should.be.equal('FEATURESriversds')
    configuration = layer.configuration
    configuration.sourceLayerName.should.be.equal('FEATURESriversds')
    configuration.count.should.be.equal(357)
    configuration.pane.should.be.equal('vector')
    configuration.style.should.exist

  })

  it('should construct a new GeoPackage source and get a vector tile', async () => {
    let geoPackagePath = path.join(__dirname, '..', 'fixtures', 'geopackage', 'rivers.gpkg')
    let source = new GeoPackageSource(geoPackagePath, 'id')
    source.filePath.should.be.equal(geoPackagePath)
    source.sourceId.should.be.equal('id')
    let layers = await source.retrieveLayers()
    layers.length.should.be.equal(2)

    await layers[1].initialize()
    let layer = layers[1]
    layer.filePath.should.be.equal(geoPackagePath)
    layer.name.should.be.equal('FEATURESriversds')
    let configuration = layer.configuration
    configuration.sourceLayerName.should.be.equal('FEATURESriversds')
    configuration.count.should.be.equal(357)
    configuration.pane.should.be.equal('vector')
    configuration.style.should.exist
    return new Promise(function(resolve) {
      layer.renderTile({x: 0, y: 0, z: 0}, null, function(err, pngData) {
        pngData.should.exist
        // jetpack.write('/tmp/000.png', pngData)
        resolve()
      })
    })
  })

  it.only('should construct a new GeoPackage source and get the 1-0-0 vector tile', async () => {
    let geoPackagePath = path.join(__dirname, '..', 'fixtures', 'geopackage', 'ne_rivers.gpkg')
    let source = new GeoPackageSource(geoPackagePath, 'id')
    source.filePath.should.be.equal(geoPackagePath)
    source.sourceId.should.be.equal('id')
    let layers = await source.retrieveLayers()
    layers.length.should.be.equal(1)

    await layers[0].initialize()
    let layer = layers[0]
    layer.filePath.should.be.equal(geoPackagePath)
    let configuration = layer.configuration
    configuration.pane.should.be.equal('vector')
    configuration.style.should.exist
    return new Promise(function(resolve) {
      layer.renderTile({x: 3, y: 6, z: 4}, null, function(err, pngData) {
        pngData.should.exist
        jetpack.write('/tmp/346.png', pngData)
        resolve()
      })
    })
  })

  it('should construct a new GeoPackage source and get an imagery tile', async () => {
    let geoPackagePath = path.join(__dirname, '..', 'fixtures', 'geopackage', 'rivers.gpkg')
    let source = new GeoPackageSource(geoPackagePath, 'id')
    source.filePath.should.be.equal(geoPackagePath)
    source.sourceId.should.be.equal('id')
    let layers = await source.retrieveLayers()
    layers.length.should.be.equal(2)

    await layers[0].initialize()
    let layer = layers[0]
    layer.filePath.should.be.equal(geoPackagePath)
    layer.name.should.be.equal('TILESosmds')
    let configuration = layer.configuration
    configuration.sourceLayerName.should.be.equal('TILESosmds')
    configuration.count.should.be.equal(85)
    configuration.pane.should.be.equal('tile')
    configuration.style.should.exist
    return new Promise(function(resolve) {
      layer.renderTile({x: 0, y: 0, z: 0}, null, function(err, pngData) {
        pngData.should.exist
        // jetpack.write('/tmp/image000.png', pngData)
        resolve()
      })
    })
  })

  it('should construct a new GeoPackage source and get the map layer', async () => {
    let geoPackagePath = path.join(__dirname, '..', 'fixtures', 'geopackage', 'rivers.gpkg')
    let source = new GeoPackageSource(geoPackagePath, 'id')
    source.filePath.should.be.equal(geoPackagePath)
    source.sourceId.should.be.equal('id')
    let layers = await source.retrieveLayers()
    layers.length.should.be.equal(2)

    await layers[0].initialize()
    let layer = layers[0]
    layer.filePath.should.be.equal(geoPackagePath)
    layer.name.should.be.equal('TILESosmds')
    let configuration = layer.configuration
    configuration.sourceLayerName.should.be.equal('TILESosmds')
    configuration.count.should.be.equal(85)
    configuration.pane.should.be.equal('tile')
    configuration.style.should.exist
    let mapLayer = layer.mapLayer
    mapLayer.length.should.be.equal(1)
    mapLayer[0].id.should.be.equal(layer.id)
  })

})
