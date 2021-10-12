import path from 'path'
import jetpack from 'fs-jetpack'
import Source from '../Source'
import MBTilesLayer from '../../layer/tile/MBTilesLayer'
import { leafletStyle } from '../../util/style/CommonStyleUtilities'
import { getDb, getInfo, getZoomRange } from '../../util/rendering/MBTilesUtilities'
import { MBTILES } from '../../layer/LayerTypes'

export default class MBTilesSource extends Source {
  async retrieveLayers () {
    let name = path.basename(this.filePath, path.extname(this.filePath))
    const { layerId, layerDirectory } = this.createLayerDirectory()
    let filePath = path.join(layerDirectory, path.basename(this.filePath))
    await jetpack.copyAsync(this.filePath, filePath)

    const db = getDb(this.filePath)
    let info = getInfo(db)
    if (info.name) {
      name = info.name
    }
    let minZoom, maxZoom, format
    if (info.minZoom === undefined || info.maxZoom === undefined) {
      let zoomRange = getZoomRange(db)
      minZoom = zoomRange.min
      maxZoom = zoomRange.max
    } else {
      minZoom = info.minZoom
      maxZoom = info.maxZoom
    }
    if (info.format != null) {
      switch (info.format) {
        case 'pbf':
          format = 'pbf'
          break
        case 'jpg':
          format = 'image/jpg'
          break
        default:
          format = 'image/png'
          break
      }
    } else {
      throw new Error('Unable to determine data format.')
    }

    if (db) {
      try {
        db.close()
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to close MBTiles database file.')
      }
    }

    return [
      new MBTilesLayer({
        id: layerId,
        layerType: MBTILES,
        extent: info.bounds || [-180, -90, 90, 180],
        minZoom: minZoom,
        maxZoom: maxZoom,
        format: format,
        directory: layerDirectory,
        sourceDirectory: this.directory,
        filePath: filePath,
        name: name,
        sourceLayerName: name,
        pointStyle: leafletStyle(),
        lineStyle: leafletStyle(),
        polygonStyle: leafletStyle()
      })
    ]
  }
}
