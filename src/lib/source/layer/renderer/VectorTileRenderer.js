import MapboxGL from '@mapbox/mapbox-gl-native'
import Sharp from 'sharp'
import Mercator from '@mapbox/sphericalmercator'

export default class VectorTileRenderer {
  _mapboxGLMap
  style
  constructor (style, getVectorTileProtobuf, images) {
    let map = this._mapboxGlMap = new MapboxGL.Map({
      request: async function (req, callback) {
        console.log('req', req)
        let split = req.url.split('-')
        let z = Number(split[0])
        let x = Number(split[1])
        let y = Number(split[2])
        let buffer = await getVectorTileProtobuf(x, y, z, map)
        return callback(null, {data: buffer})
      },
      ratio: 1
    })
    this.style = style
    this.images = images
  }

  async init () {
    this._mapboxGlMap.load(this.style)

    if (this.images) {
      for (const image of this.images) {
        let imageData = await Sharp(image.filePath).raw().toBuffer()
        // let imageData = fs.readFileSync(image.filePath)

        console.log('adding the image to the map', image.id)
        this._mapboxGlMap.addImage(image.id, imageData, {
          height: 16,
          width: 16,
          pixelRatio: 1,
          sdf: false
        })
      }
    }
    console.log('Loading the style in the renderer')
  }

  waitForRenderer () {
    return new Promise((resolve) => {
      let check = () => {
        if (this.rendering) {
          setTimeout(check.bind(this), 100)
        } else {
          return resolve(this.rendering = true)
        }
      }
      check()
    })
  }

  async renderVectorTile (coords, tileCanvas, done) {
    let map = this._mapboxGlMap
    let {x, y, z} = coords
    let mapboxZoom = Math.max(0, z - 1)
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
    await this.waitForRenderer()
    map.render({
      zoom: mapboxZoom,
      center: [tileCenter[0], tileCenter[1]],
      width: renderWidth,
      height: renderHeight
    }, async (err, buffer) => {
      this.rendering = false
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
        if (data) {
          let context = tileCanvas.getContext('2d')
          context.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0)
        }
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
}
