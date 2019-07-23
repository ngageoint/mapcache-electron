import VectorLayer from './VectorLayer'
import * as vendor from '../../../vendor'
import MapboxUtilities from '../../../MapboxUtilities'

export default class DrawingLayer extends VectorLayer {
  async initialize () {
    this.features = this._configuration.features
    if (!this.style) {
      this.style = MapboxUtilities.defaultLeafletStyle()
    }
    await super.initialize()
    return this
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: 'Drawing'
      }
    }
  }

  get featureCollection () {
    return {
      type: 'FeatureCollection',
      features: this.features
    }
  }

  /**
   * Overwrite VectorLayer.mapLayer since we want to render drawings as features, not tiles
   */
  get mapLayer () {
    let mapboxStyleValues = this.style
    if (!this._mapLayer) {
      this._mapLayer = new vendor.L.LayerGroup()
      this._mapLayer.id = this.id
    }
    this._mapLayer.remove()
    this._configuration.features.forEach(feature => {
      if (feature.properties.radius) {
        let style = {
          radius: feature.properties.radius,
          fillColor: mapboxStyleValues.circleColor,
          fillOpacity: mapboxStyleValues.circleOpacity,
          color: mapboxStyleValues.circleLineColor,
          opacity: mapboxStyleValues.circleLineOpacity,
          weight: mapboxStyleValues.circleLineWeight
        }
        let layer = new vendor.L.Circle([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], style)
        layer.id = feature.id
        this._mapLayer.addLayer(layer)
      } else if (feature.geometry.type.toLowerCase() === 'polygon' || feature.geometry.type.toLowerCase() === 'multipolygon') {
        let style = {
          radius: feature.properties.radius,
          fillColor: mapboxStyleValues.polygonColor,
          fillOpacity: mapboxStyleValues.polygonOpacity,
          color: mapboxStyleValues.polygonLineColor,
          opacity: mapboxStyleValues.polygonLineOpacity,
          weight: mapboxStyleValues.polygonLineWeight
        }
        let layer = new vendor.L.GeoJSON(feature, { style: style })
        layer.id = feature.id
        this._mapLayer.addLayer(layer)
      } else {
        let style = {
          color: mapboxStyleValues.lineColor,
          opacity: mapboxStyleValues.lineOpacity,
          weight: mapboxStyleValues.lineWeight
        }
        let layer = new vendor.L.GeoJSON(feature, { style: style })
        layer.id = feature.id
        this._mapLayer.addLayer(layer)
      }
    })
    return this._mapLayer
  }
}
