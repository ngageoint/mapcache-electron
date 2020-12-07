import * as GeoTIFF from 'geotiff'

export default class GeoTIFFUtilities {
  static async readRasters (filePath) {
    const geotiff = await GeoTIFF.fromFile(filePath)
    const image = await geotiff.getImage()
    return await image.readRasters()
  }
}
