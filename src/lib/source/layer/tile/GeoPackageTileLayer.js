import { GeoPackageAPI } from '@ngageoint/geopackage'
import TileLayer from './TileLayer'
import LayerTypes from '../LayerTypes'

export default class GeoPackageTileLayer extends TileLayer {
  geopackage

  constructor (configuration) {
    super(configuration)
    this.extent = configuration.extent
    this.minZoom = configuration.minZoom
    this.maxZoom = configuration.maxZoom
  }

  async initialize () {
    this.geopackage = await GeoPackageAPI.open(this.filePath)
    await super.initialize()
    return this
  }

  update (configuration) {
    super.update(configuration)
  }

  setRenderer (renderer) {
    this.renderer = renderer
    this.renderer.setGeoPackage(this.geopackage)
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        extent: this.extent,
        layerType: LayerTypes.GEOPACKAGE,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom
      }
    }
  }

  close () {
    if (this.geopackage) {
      try {
        this.geopackage.close()
        // eslint-disable-next-line no-unused-vars
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to close GeoPackage')
      }
      this.geopackage = undefined
      if (this.renderer) {
        this.renderer.setGeoPackage(null)
      }
    }
  }
}
