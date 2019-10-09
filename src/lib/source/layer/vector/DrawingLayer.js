import VectorLayer from './VectorLayer'
import * as vendor from '../../../vendor'
import VectorStyleUtilities from '../../../VectorStyleUtilities'
import _ from 'lodash'

export default class DrawingLayer extends VectorLayer {
  async initialize () {
    this.features = this._configuration.features
    if (!this.style) {
      this.style = VectorStyleUtilities.defaultLeafletStyle()
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

  async updateStyle (style) {
    this.style = style
  }

  /**
   * Overwrite VectorLayer.mapLayer since we want to render drawings as features, not tiles
   */
  get mapLayer () {
    if (!this._mapLayer) {
      this._mapLayer = new vendor.L.LayerGroup()
      this._mapLayer.id = this.id
    }
    this._mapLayer.remove()
    this.featureCollection.features.forEach(feature => {
      let featureStyle = _.isNil(this.style.features[feature.id]) ? this.style.styleRowMap[this.style.default.styles[feature.geometry.type]] : this.style.styleRowMap[this.style.features[feature.id].style]
      let iconOrStyle = _.isNil(this.style.features[feature.id]) ? this.style.default.iconOrStyle[feature.geometry.type] : this.style.features[feature.id].iconOrStyle
      let featureIcon = _.isNil(this.style.features[feature.id]) ? this.style.iconRowMap[this.style.default.icons[feature.geometry.type]] : this.style.iconRowMap[this.style.features[feature.id].icon]
      let layer
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        let style = {
          fillColor: featureStyle.fillColor,
          fillOpacity: featureStyle.fillOpacity,
          color: featureStyle.color,
          opacity: featureStyle.opacity,
          weight: featureStyle.width
        }
        layer = new vendor.L.GeoJSON(feature, { style: style })
      } else if (feature.geometry.type === 'Point') {
        if (iconOrStyle === 'icon') {
          let icon = vendor.L.icon({
            iconUrl: featureIcon.url,
            iconSize: [featureIcon.width, featureIcon.height], // size of the icon
            iconAnchor: [Math.round(featureIcon.anchor_u * featureIcon.width), Math.round(featureIcon.anchor_v * featureIcon.height)] // point of the icon which will correspond to marker's location
          })
          layer = vendor.L.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], { icon: icon })
        } else {
          let style = {
            fillColor: featureStyle.color,
            fillOpacity: featureStyle.opacity,
            color: featureStyle.color,
            opacity: featureStyle.opacity,
            weight: featureStyle.width
          }
          layer = new vendor.L.GeoJSON(feature, {
            pointToLayer: function (feature, latlng) {
              return vendor.L.circleMarker(latlng, style)
            }})
        }
      } else {
        let style = {
          color: featureStyle.color,
          opacity: featureStyle.opacity,
          weight: featureStyle.width
        }
        layer = new vendor.L.GeoJSON(feature, { style: style })
      }
      layer.id = feature.id
      this._mapLayer.addLayer(layer)
    })
    return this._mapLayer
  }
}
