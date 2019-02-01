import jetpack from 'fs-jetpack'
import Layer from './Layer'
import MapcacheMapLayer from '../../map/MapcacheMapLayer'
import GeoPackage from '@ngageoint/geopackage'
import TileBoundingBoxUtils from '../../tile/tileBoundingBoxUtils'
import MapboxGL from '@mapbox/mapbox-gl-native'
import Sharp from 'sharp'
import Mercator from '@mapbox/sphericalmercator'

export default class GeoPackageLayer extends Layer {
  extent
  _style
  geopackage
  dao
  count
  _mapboxGlMap

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
    let {x, y, z} = TileBoundingBoxUtils.determineXYZTileInsideExtent([this.extent[0], this.extent[1]], [this.extent[2], this.extent[3]])
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
      this._mapboxGlMap = new MapboxGL.Map({
        request: function (req, callback) {
          let split = req.url.split('-')
          let z = Number(split[0])
          let x = Number(split[1])
          let y = Number(split[2])
          console.log('go get the tile', req)
          GeoPackage.getVectorTileProtobuf(gp, tableName, x, y, z)
            .then(function (buff) {
              callback(null, {data: buff})
            })
        },
        ratio: 1
      })

      let styleSources = {}
      styleSources[this.name] = {
        'type': 'vector',
        'maxzoom': 18,
        'tiles': [
          '{z}-{x}-{y}'
        ]
      }

      this._mapboxGlMap.load({
        'version': 8,
        'name': 'Empty',
        'sources': styleSources,
        'layers': [
          {
            'id': this.sourceLayerName + 'line',
            'type': 'line',
            'source': this.sourceLayerName,
            'source-layer': this.sourceLayerName,
            'paint': {
              'line-width': 1.0,
              'line-color': 'blue'
            }
          },
          {
            'id': this.sourceLayerName + 'circle',
            'type': 'circle',
            'source': this.sourceLayerName,
            'source-layer': this.sourceLayerName,
            'paint': {
              'circle-radius': {
                'stops': [
                  [0, 5],
                  [20, 10]
                ],
                'base': 2
              },
              'circle-color': '#5b94c6',
              'circle-opacity': 0.6
            }
          }
        ]
      })
      await this.renderOverviewTile()
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
    let map = this._mapboxGlMap
    let {x, y, z} = coords
    let width = tileCanvas ? tileCanvas.width : 256
    let height = tileCanvas ? tileCanvas.height : 256

    let merc = new Mercator()
    let longitude = ((x + 0.5) / (1 << z)) * (256 << z)
    let latitude = ((y + 0.5) / (1 << z)) * (256 << z)
    let tileCenter = merc.ll([
      longitude,
      latitude
    ], z)

    let renderWidth = z === 0 ? width * 2 : width
    let renderHeight = z === 0 ? height * 2 : height

    map.render({
      zoom: z,
      center: [tileCenter[0], tileCenter[1]],
      width: renderWidth,
      height: renderHeight
    }, async (err, buffer) => {
      if (err) throw err
      if (tileCanvas) {
        let image = await Sharp(buffer, {
          raw: {
            width: renderWidth,
            height: renderHeight,
            channels: 4
          }
        })

        if (z === 0) {
          image.resize(width, height)
        }
        const data = await image.raw()
          .toBuffer()
        tileCanvas.putImageData(new ImageData(data, width, height))
        if (done) {
          done(null, tileCanvas)
        }
        return tileCanvas
      } else {
        let image = Sharp(buffer, {
          raw: {
            width: renderWidth,
            height: renderHeight,
            channels: 4
          }
        })
        if (z === 0) {
          image.resize(width, height)
        }
        const pngdata = await image.png()
          .toBuffer()
        if (done) {
          done(null, pngdata)
        }
        return pngdata
      }
    })
  }

  renderOverviewTile () {
    let map = this._mapboxGlMap
    return new Promise(function (resolve) {
      map.render({zoom: 0}, function (err, buffer) {
        if (err) throw err
        let image = Sharp(buffer, {
          raw: {
            width: 512,
            height: 512,
            channels: 4
          }
        })

        image.toFile('/tmp/image.png', function (err) {
          if (err) throw err
          resolve()
        })
      })
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
      opacity: 1
    }
    return this._style
  }

  get mapLayer () {
    if (this._mapLayer) return [this._mapLayer]

    this._mapLayer = new MapcacheMapLayer({
      layer: this,
      pane: this.pane
    })

    this._mapLayer.id = this.id
    return [this._mapLayer]
  }
}
