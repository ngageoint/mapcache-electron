import TileLayer from './TileLayer'
import MBTilesUtilities from '../../../util/MBTilesUtilities'
import VectorStyleUtilities from '../../../util/VectorStyleUtilities'
import LayerTypes from '../LayerTypes'

export default class MBTilesLayer extends TileLayer {
  minZoom
  maxZoom
  db
  pointStyle
  lineStyle
  polygonStyle

  constructor (configuration = {}) {
    super(configuration)
  }

  setRenderer (renderer) {
    this.renderer = renderer
    this.renderer.setDb(this.db)
    this.renderer.setStyle(this.pointStyle, this.lineStyle, this.polygonStyle)
  }

  async initialize () {
    this.db = MBTilesUtilities.getDb(this.filePath)
    let info = MBTilesUtilities.getInfo(this.db)
    if (info.minZoom === undefined || info.maxZoom === undefined) {
      let zoomRange = MBTilesUtilities.getZoomRange(this.db)
      this.minZoom = zoomRange.min
      this.maxZoom = zoomRange.max
    } else {
      this.minZoom = info.minZoom
      this.maxZoom = info.maxZoom
    }
    if (info.format !== null) {
      switch (info.format) {
        case 'pbf':
          this.format = 'pbf'
          break
        case 'jpg':
          this.format = 'image/jpg'
          break
        default:
          this.format = 'image/png'
          break
      }
    } else {
      throw new Error('Unable to determine data format.')
    }

    this.pointStyle = this._configuration.pointStyle || VectorStyleUtilities.leafletStyle()
    this.lineStyle = this._configuration.lineStyle || VectorStyleUtilities.leafletStyle()
    this.polygonStyle = this._configuration.polygonStyle || VectorStyleUtilities.leafletStyle()
    await super.initialize()
    return this
  }

  getRepaintFields() {
    return ['pointStyle', 'lineStyle', 'polygonStyle'].concat(super.getRepaintFields())
  }

  update (configuration) {
    super.update(configuration)
    this.pointStyle = configuration.pointStyle || VectorStyleUtilities.leafletStyle()
    this.lineStyle = configuration.lineStyle || VectorStyleUtilities.leafletStyle()
    this.polygonStyle = configuration.polygonStyle || VectorStyleUtilities.leafletStyle()
    if (this.renderer) {
      this.renderer.setStyle(this.pointStyle, this.lineStyle, this.polygonStyle)
    }
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: LayerTypes.MBTILES,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
        pointStyle: this.pointStyle,
        lineStyle: this.lineStyle,
        polygonStyle: this.polygonStyle,
        format: this.format
      }
    }
  }

  get extent () {
    let db
    let extent = [-180, -90, 90, 180]
    try {
      db = MBTilesUtilities.getDb(this.filePath)
      extent = MBTilesUtilities.getInfo(db).bounds
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to open MBTiles database or retrieve extent.')
    } finally {
      if (db) {
        try {
          db.close()
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to close MBTiles database file.')
        }
      }
    }
    return extent
  }

  close () {
    if (this.db) {
      try {
        this.db.close()
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to close MBTiles database file.')
      }
      this.db = undefined
    }
    if (this.renderer) {
      this.renderer.setDb(null)
    }
  }
}
