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

  get tileIndexFeatureCollection () {
    return MapboxUtilities.getMapboxFeatureCollectionForStyling(this.features)
  }

  async updateStyle (style) {
    this.style = style
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
    this.featureCollection.features.forEach(feature => {
      let layer
      if (feature.properties.radius) {
        let style = {
          radius: feature.properties.radius,
          fillColor: mapboxStyleValues.circleColor,
          fillOpacity: mapboxStyleValues.circleOpacity,
          color: mapboxStyleValues.circleLineColor,
          opacity: mapboxStyleValues.circleLineOpacity,
          weight: mapboxStyleValues.circleLineWeight
        }
        layer = new vendor.L.Circle([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], style)
      } else if (feature.geometry.type.toLowerCase() === 'polygon' || feature.geometry.type.toLowerCase() === 'multipolygon') {
        let style = {
          radius: feature.properties.radius,
          fillColor: mapboxStyleValues.polygonColor,
          fillOpacity: mapboxStyleValues.polygonOpacity,
          color: mapboxStyleValues.polygonLineColor,
          opacity: mapboxStyleValues.polygonLineOpacity,
          weight: mapboxStyleValues.polygonLineWeight
        }
        layer = new vendor.L.GeoJSON(feature, { style: style })
      } else if (feature.geometry.type.toLowerCase() === 'point') {
        if (this.style.pointIconOrStyle === 'icon' && mapboxStyleValues.pointIcon !== undefined && mapboxStyleValues.pointIcon !== null) {
          let icon = vendor.L.icon({
            iconUrl: mapboxStyleValues.pointIcon.url,
            iconSize: [mapboxStyleValues.pointIcon.width, mapboxStyleValues.pointIcon.height], // size of the icon
            iconAnchor: [Math.round(mapboxStyleValues.pointIcon.anchor_u * mapboxStyleValues.pointIcon.width), Math.round(mapboxStyleValues.pointIcon.anchor_v * mapboxStyleValues.pointIcon.height)] // point of the icon which will correspond to marker's location
          })
          layer = vendor.L.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], { icon: icon })
        } else {
          let style = {
            radius: mapboxStyleValues.pointRadiusInPixels,
            fillColor: mapboxStyleValues.pointColor,
            fillOpacity: mapboxStyleValues.pointOpacity,
            color: mapboxStyleValues.pointColor,
            opacity: mapboxStyleValues.pointOpacity,
            weight: 0
          }
          layer = new vendor.L.GeoJSON(feature, {
            pointToLayer: function (feature, latlng) {
              return vendor.L.circleMarker(latlng, style)
            }})
        }
      } else {
        let style = {
          color: mapboxStyleValues.lineColor,
          opacity: mapboxStyleValues.lineOpacity,
          weight: mapboxStyleValues.lineWeight
        }
        layer = new vendor.L.GeoJSON(feature, { style: style })
      }
      layer.id = feature.id
      this._mapLayer.addLayer(layer)
    })
    return this._mapLayer
  }
}
