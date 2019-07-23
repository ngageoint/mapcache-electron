import * as BrowserMock from './mocks/browser'
import * as LeafletMock from './mocks/leaflet'
import sinon from 'sinon'
import path from 'path'
import jetpack from 'fs-jetpack'
import * as Settings from '../../src/lib/settings/Settings'
import GDALSource from '../../src/lib/source/GDALSource'
import GeoTiffLayer from '../../src/lib/source/layer/tile/GeoTiffLayer'

describe('GDAL Source Tests', function () {
  let sandbox

  before(() => {
    sandbox = sinon.createSandbox()
    sandbox.stub(Settings, 'userDataDir').returns(jetpack.cwd('/tmp'))
  })

  after(() => {
    sandbox.restore()
  })

  describe('KML tests', () => {
    let kmlPath = path.join(__dirname, '..', 'fixtures', 'nepal', 'doc.kml')

    it('should construct a new GDAL KML source and initialize the layers', async () => {
      let source = new GDALSource(kmlPath, 'id')
      source.filePath.should.be.equal(kmlPath)
      source.sourceId.should.be.equal('id')
      let layers = await source.retrieveLayers()
      layers.length.should.be.equal(2)
      await layers[0].initialize()
      let layer = layers[0]
      layer.filePath.should.be.equal(kmlPath)
      layer.name.should.be.equal('Radar Footprint')
      let configuration = layer.configuration
      configuration.sourceLayerName.should.be.equal('Radar Footprint')
      configuration.count.should.be.equal(1)
      configuration.pane.should.be.equal('vector')
      configuration.style.should.exist

      await layers[1].initialize()
      layer = layers[1]
      layer.filePath.should.be.equal(kmlPath)
      layer.name.should.be.equal('All_Damage_Nepal_April_30th_2015_points')
      configuration = layer.configuration
      configuration.sourceLayerName.should.be.equal('All_Damage_Nepal_April_30th_2015_points')
      configuration.count.should.be.equal(3806)
      configuration.pane.should.be.equal('vector')
      configuration.style.should.exist

      let mapLayer = layer.mapLayer
      mapLayer.length.should.be.equal(1)
      mapLayer[0].id.should.be.equal(layer.id)

      console.log('render the tile')
      return new Promise(function(resolve) {
        layer.renderTile({x: 1509, y: 859, z: 11}, null, function(err, pngData) {
        // layer.renderTile({x: 0, y: 0, z: 0}, null, function(err, pngData) {

          console.log('pngData', pngData)
          pngData.should.exist
          jetpack.write('/tmp/image000.png', pngData)
          resolve()
        })
      })

    })
  })

  describe('GeoJSON tests', () => {
    let geojsonPath = path.join(__dirname, '..', 'fixtures', 'geojson', 'ne_50m_land.geojson')

    it('should construct a new GDAL GeoJSON source and initialize the layers and get the final configuration', async () => {
      let source = new GDALSource(geojsonPath, 'id')
      source.filePath.should.be.equal(geojsonPath)
      source.sourceId.should.be.equal('id')
      let layers = await source.retrieveLayers()
      layers.length.should.be.equal(1)
      let layer = layers[0]
      await layer.initialize()
      layer.filePath.should.not.be.equal(geojsonPath)
      layer.name.should.be.equal('ne_50m_land')
      let configuration = layer.configuration
      configuration.sourceLayerName.should.be.equal('OGRGeoJSON')
      configuration.count.should.be.equal(1421)
      configuration.pane.should.be.equal('vector')
      configuration.style.should.exist
    })
  })

  describe('GeoTIFF tests', () => {

    let geotiffPath = path.join(__dirname, '..', 'fixtures', 'denver.tif')

    it('should construct a new GDAL GeoTIFF source', async () => {
      let source = new GDALSource(geotiffPath, 'id')
      source.filePath.should.be.equal(geotiffPath)
      source.sourceId.should.be.equal('id')
      let layers = await source.retrieveLayers()
      for (const layer of layers) {
        await layer.initialize()
        layer.filePath.should.be.equal(geotiffPath)
        layer.name.should.be.equal('denver')
        let configuration = layer.configuration
        configuration.sourceLayerName.should.be.equal('denver')
        configuration.pane.should.be.equal('tile')
        configuration.style.should.exist
        let mapLayer = layer.mapLayer
        mapLayer.should.exist
        mapLayer.id.should.be.equal(layer.id)
      }
    })
  })

  describe('Palette GeoTIFF tests', () => {

    let geotiffPath = path.join(__dirname, '..', 'fixtures', '374510522_Medano_Pass_FSTopo.tif')

    it('should construct a new GDAL GeoTIFF source', async () => {
      let source = new GDALSource(geotiffPath, 'id')
      source.filePath.should.be.equal(geotiffPath)
      source.sourceId.should.be.equal('id')
      let layers = await source.retrieveLayers()
      for (const layer of layers) {
        await layer.initialize()
        layer.filePath.should.be.equal(geotiffPath)
        layer.name.should.be.equal('374510522_Medano_Pass_FSTopo')
        let configuration = layer.configuration
        configuration.sourceLayerName.should.be.equal('374510522_Medano_Pass_FSTopo')
        configuration.pane.should.be.equal('tile')
        configuration.style.should.exist
        let mapLayer = layer.mapLayer
        mapLayer.should.exist
        mapLayer.id.should.be.equal(layer.id)
      }
    })
  })

  describe.skip('KMZ tests', () => {
    let kmlPath = path.join(__dirname, '..', 'fixtures', 'kmz', 'nepalkmz.kmz')

    it('should construct a new GDAL KMZ source', async () => {
      let source = new GDALSource(kmlPath, 'id')
      source.filePath.should.be.equal(kmlPath)
      source.sourceId.should.be.equal('id')
      let layers = await source.retrieveLayers()
    })
  })
})
