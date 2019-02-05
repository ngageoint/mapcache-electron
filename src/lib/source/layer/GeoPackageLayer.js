import jetpack from 'fs-jetpack'
import Layer from './Layer'
import MapcacheMapLayer from '../../map/MapcacheMapLayer'
import GeoPackage from '@ngageoint/geopackage'
import TileBoundingBoxUtils from '../../tile/tileBoundingBoxUtils'
import VectorTileRenderer from './renderer/VectorTileRenderer'

export default class GeoPackageLayer extends Layer {
  extent
  geopackage
  dao
  count
  _vectorTileRenderer

  async initialize () {
    console.log('opening', this.filePath)
    this.geopackage = await GeoPackage.open(this.filePath)
    let contentsDao = this.geopackage.getContentsDao()
    let contents = contentsDao.queryForId(this.sourceLayerName)

    let proj = contentsDao.getProjection(contents)
    let ll = proj.inverse([contents.min_x, contents.min_y])
    let ur = proj.inverse([contents.max_x, contents.max_y])
    this.extent = [ll[0], ll[1], ur[0], ur[1]]
    let {width, height} = TileBoundingBoxUtils.determineImageDimensionsFromExtent(ll, ur)
    let coords = TileBoundingBoxUtils.determineXYZTileInsideExtent([this.extent[0], this.extent[1]], [this.extent[2], this.extent[3]])
    if (this.pane === 'tile') {
      this.dao = this.geopackage.getTileDao(this.sourceLayerName)
      if (!jetpack.exists(this.overviewTilePath)) {
        let retriever = new GeoPackage.GeoPackageTileRetriever(this.dao, width, height)
        let targetBoundingBox = new GeoPackage.BoundingBox(ll[0], ur[0], ll[1], ur[1])
        let tilePng = await retriever.getTileWithWgs84BoundsInProjection(targetBoundingBox, this.dao.minZoom, 'EPSG:4326')
        console.log('writing file to ', this.overviewTilePath)
        jetpack.write(this.overviewTilePath, Buffer.from(tilePng))
      }
    } else if (this.pane === 'vector') {
      this.dao = this.geopackage.getFeatureDao(this.sourceLayerName)
      let gp = this.geopackage
      let tableName = this.sourceLayerName
      let styleSources = {}
      styleSources[this.name] = {
        'type': 'vector',
        'maxzoom': 18,
        'tiles': [
          '{z}-{x}-{y}'
        ]
      }

      let style = {
        'version': 8,
        'name': 'Empty',
        'sources': styleSources,
        'glyphs': '/data/github/fonts/_output/{fontstack}/{range}.pbf',
        'layers': [
          {
            'id': 'fill-style',
            'type': 'fill',
            'source': this.name,
            'source-layer': this.name,
            'filter': ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
            'paint': {
              'fill-color': this.style.fillColor,
              'fill-opacity': this.style.fillOpacity
            }
          },
          {
            'id': 'line-style',
            'type': 'line',
            'source': this.name,
            'source-layer': this.name,
            'filter': ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
            'paint': {
              'line-width': this.style.weight,
              'line-color': this.style.color
            }
          },
          {
            'id': 'point-style',
            'type': 'circle',
            'source': this.name,
            'source-layer': this.name,
            'filter': ['match', ['geometry-type'], ['Point'], true, false],
            'paint': {
              'circle-color': this.style.fillColor,
              'circle-stroke-color': this.style.color,
              'circle-opacity': this.style.fillOpacity,
              'circle-stroke-width': this.style.weight,
              'circle-radius': this.style.weight
            }
          }
          // ,
          // {
          //   'id': 'text-style',
          //   'type': 'symbol',
          //   'source': this.name,
          //   'source-layer': this.name,
          //   'layout': {
          //     'text-field': ['to-string', ['get', 'label']],
          //     'text-font': ['Open Sans Regular']
          //   },
          //   'paint': { }
          // }
        ]
      }
      this._vectorTileRenderer = new VectorTileRenderer(style, (x, y, z) => {
        return GeoPackage.getVectorTileProtobuf(gp, tableName, x, y, z)
      })

      await this.renderOverviewTile(coords)
    }
    this.count = this.dao.count()
    return this
  }

  async renderTile (coords, tileCanvas, done) {
    if (this.pane === 'vector') {
      this.renderVectorTile(coords, tileCanvas, done)
    } else {
      this.renderImageryTile(coords, tileCanvas, done)
    }
  }

  async renderImageryTile (coords, tileCanvas, done) {
    let {x, y, z} = coords
    if (tileCanvas) {
      console.log('tile Canvas is', tileCanvas)
      await GeoPackage.drawXYZTileInCanvas(this.geopackage, this.sourceLayerName, x, y, z, tileCanvas.width, tileCanvas.height, tileCanvas)
      if (done) {
        done(null, tileCanvas)
      }
    } else {
      let image = await GeoPackage.getTileFromXYZ(this.geopackage, this.sourceLayerName, x, y, z, 256, 256)
      if (done) {
        done(null, image)
      }
    }
  }

  async renderVectorTile (coords, tileCanvas, done) {
    this._vectorTileRenderer.renderVectorTile(coords, tileCanvas, done)
  }

  renderOverviewTile (coords) {
    let overviewTilePath = this.overviewTilePath
    this.renderTile(coords, null, function (err, imageData) {
      if (err) throw err
      jetpack.write(overviewTilePath, imageData)
    })
  }

  get configuration () {
    return {
      filePath: this.filePath,
      sourceLayerName: this.sourceLayerName,
      name: this.name,
      id: this.id,
      extent: this.extent,
      pane: this.pane,
      layerType: 'GeoPackage',
      overviewTilePath: this.overviewTilePath,
      style: this.style,
      count: this.count
    }
  }

  get style () {
    this._style = this._style || {
      weight: 2,
      radius: 2,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      opacity: 1,
      fillColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
      fillOpacity: 0.5,
      fill: false
    }
    return this._style
  }

  get mapLayer () {
    if (this._mapLayer) return [this._mapLayer]

    this._mapLayer = new MapcacheMapLayer({
      layer: this,
      pane: this.pane === 'tile' ? 'tilePane' : 'overlayPane'
    })

    this._mapLayer.id = this.id
    return [this._mapLayer]
  }
}
