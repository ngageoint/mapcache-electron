import TileLayer from './TileLayer'
import { MBTILES } from '../LayerTypes'

export default class MBTilesLayer extends TileLayer {
  minZoom
  maxZoom
  pointStyle
  lineStyle
  polygonStyle
  dbFile
  constructor (configuration = {}) {
    super(configuration)
    this.dbFile = configuration.filePath
    this.minZoom = configuration.minZoom
    this.maxZoom = configuration.maxZoom
    this.extent = configuration.extent
    this.format = configuration.format
    this.pointStyle = configuration.pointStyle
    this.lineStyle = configuration.lineStyle
    this.polygonStyle = configuration.polygonStyle
  }

  setRenderer (renderer) {
    this.renderer = renderer
    this.renderer.setStyle(this.pointStyle, this.lineStyle, this.polygonStyle)
  }

  getRepaintFields() {
    return ['pointStyle', 'lineStyle', 'polygonStyle'].concat(super.getRepaintFields())
  }

  update (configuration) {
    super.update(configuration)
    this.pointStyle = configuration.pointStyle
    this.lineStyle = configuration.lineStyle
    this.polygonStyle = configuration.polygonStyle
    if (this.renderer) {
      this.renderer.setStyle(this.pointStyle, this.lineStyle, this.polygonStyle)
    }
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: MBTILES,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
        pointStyle: this.pointStyle,
        lineStyle: this.lineStyle,
        polygonStyle: this.polygonStyle,
        format: this.format,
        extent: this.extent
      }
    }
  }

  cancel (coords) {
    this.renderer.cancel(coords)
  }
}
