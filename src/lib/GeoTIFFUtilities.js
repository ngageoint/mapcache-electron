import * as GeoTIFF from 'geotiff'
import Jimp from 'jimp'
import jetpack from 'fs-jetpack'

export default class GeoTIFFUtilities {
  static async readRasters (filePath) {
    const geotiff = await GeoTIFF.fromFile(filePath)
    const image = await geotiff.getImage()
    return await image.readRasters()
  }

  /**
   * Converts a 4326 jimp supported image into a geotiff
   * @param filePath
   * @param geotiffFilePath
   * @param extent
   * @returns {Promise<void>}
   */
  static async convert4326ImageToGeoTIFF (filePath, geotiffFilePath, extent) {
    return new Promise(resolve => {
      Jimp.read(filePath).then(image => {
        const values = new Uint8Array(image.bitmap.data)
        const metadata = {
          height: image.bitmap.height,
          width: image.bitmap.width,
          ModelPixelScale: [(extent[2] - extent[0]) / image.bitmap.width, (extent[3] - extent[1]) / image.bitmap.height, 0],
          ModelTiepoint: [0, 0, 0, extent[0], extent[3], 0],
          PhotometricInterpretation: 2
        }
        GeoTIFF.writeArrayBuffer(values, metadata).then(arrayBuffer => {
          jetpack.writeAsync(geotiffFilePath, Buffer.from(arrayBuffer)).then(() => {
            resolve(true)
          }).catch(e => {
            // eslint-disable-next-line no-console
            console.error(e)
            resolve(false)
          })
        }).catch(e => {
          // eslint-disable-next-line no-console
          console.error(e)
          resolve(false)
        })
      })
    })
  }
}
