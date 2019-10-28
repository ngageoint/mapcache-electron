import VectorLayer from './VectorLayer'
import * as vendor from '../../../vendor'
import VectorStyleUtilities from '../../../VectorStyleUtilities'
import _ from 'lodash'
import GeoPackageUtilities from '../../../GeoPackageUtilities'
import path from 'path'
import fs from 'fs'
import geojsonExtent from '@mapbox/geojson-extent'

export default class DrawingLayer extends VectorLayer {
  async initialize () {
    this.features = this._configuration.features
    let fileName = this.name + '.gpkg'
    let filePath = this.cacheFolder.file(fileName).path()
    let fullFile = path.join(filePath, fileName)
    this._geopackageFilePath = fullFile
    if (!fs.existsSync(fullFile)) {
      await GeoPackageUtilities.buildGeoPackage(fullFile, this.name, this.featureCollection, VectorStyleUtilities.defaultLeafletStyle())
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
    if (!this._mapLayer) {
      this._mapLayer = new vendor.L.LayerGroup()
      this._mapLayer.id = this.id
    }
    this._mapLayer.remove()
    this.featureCollection.features.forEach(feature => {
      let styleRow = GeoPackageUtilities.getFeatureStyleRow(this._geopackage, this.sourceLayerName, feature.id, feature.geometry.type)
      let layer
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        let style = {
          fillColor: styleRow.getFillHexColor(),
          fillOpacity: styleRow.getFillOpacity(),
          color: styleRow.getHexColor(),
          opacity: styleRow.getOpacity(),
          weight: styleRow.getWidth()
        }
        layer = new vendor.L.GeoJSON(feature, { style: style })
      } else if (feature.geometry.type === 'Point') {
        let iconRow = GeoPackageUtilities.getFeatureIconRow(this._geopackage, this.sourceLayerName, feature.id, feature.geometry.type)
        if (!_.isNil(iconRow)) {
          let icon = vendor.L.icon({
            iconUrl: 'data:' + iconRow.getContentType() + ';base64,' + iconRow.getData().toString('base64'),
            iconSize: [iconRow.getWidth(), iconRow.getHeight()], // size of the icon
            iconAnchor: [Math.round(iconRow.getAnchorU() * iconRow.getWidth()), Math.round(iconRow.getAnchorV() * iconRow.getHeight())] // point of the icon which will correspond to marker's location
          })
          layer = vendor.L.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], { icon: icon })
        } else {
          let style = {
            fillColor: styleRow.getFillHexColor(),
            fillOpacity: styleRow.getFillOpacity(),
            color: styleRow.getHexColor(),
            opacity: styleRow.getOpacity(),
            weight: styleRow.getWidth()
          }
          layer = new vendor.L.GeoJSON(feature, {
            pointToLayer: function (feature, latlng) {
              return vendor.L.circleMarker(latlng, style)
            }})
        }
      } else {
        let style = {
          color: styleRow.getHexColor(),
          opacity: styleRow.getOpacity(),
          weight: styleRow.getWidth()
        }
        layer = new vendor.L.GeoJSON(feature, { style: style })
      }
      layer.id = feature.id
      this._mapLayer.addLayer(layer)
    })
    return this._mapLayer
  }

  get extent () {
    let featureCollection = this.featureCollection
    return geojsonExtent(featureCollection)
  }
}
