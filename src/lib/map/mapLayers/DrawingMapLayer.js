import * as vendor from '../../vendor'
import _ from 'lodash'
import GeoPackageUtilities from '../../GeoPackageUtilities'
import { GeometryType } from '@ngageoint/geopackage'

export default class DrawingMapLayer {
  static constructMapLayer (drawingModel) {
    let mapLayer = new vendor.L.LayerGroup()
    mapLayer.id = drawingModel.id
    mapLayer.clearLayers()
    drawingModel.featureCollection.features.forEach(feature => {
      feature.properties.layerId = drawingModel.id
      feature.properties.featureId = feature.id
      let geometryType = GeometryType.fromName(feature.geometry.type.toUpperCase())
      let styleRow = GeoPackageUtilities.getFeatureStyleRow(drawingModel._geopackage, drawingModel.sourceLayerName, feature.id, geometryType)
      let layer
      if (geometryType === GeometryType.POLYGON || geometryType === GeometryType.MULTIPOLYGON) {
        if (_.isNil(styleRow)) {
          styleRow = GeoPackageUtilities.getTableStyle(drawingModel._geopackage, drawingModel.sourceLayerName, geometryType)
        }
        let style = {
          fillColor: styleRow.getFillHexColor(),
          fillOpacity: styleRow.getFillOpacity(),
          color: styleRow.getHexColor(),
          opacity: styleRow.getOpacity(),
          weight: styleRow.getWidth()
        }
        layer = new vendor.L.GeoJSON(feature, {style: style})
      } else if (geometryType === GeometryType.POINT) {
        let iconRow = GeoPackageUtilities.getFeatureIconRow(drawingModel._geopackage, drawingModel.sourceLayerName, feature.id, geometryType)
        if (_.isNil(iconRow) && _.isNil(styleRow)) {
          iconRow = GeoPackageUtilities.getTableIcon(drawingModel._geopackage, drawingModel.sourceLayerName, geometryType)
        }
        if (_.isNil(styleRow)) {
          styleRow = GeoPackageUtilities.getTableStyle(drawingModel._geopackage, drawingModel.sourceLayerName, geometryType)
        }

        if (!_.isNil(iconRow)) {
          let icon = vendor.L.icon({
            iconUrl: 'data:' + iconRow.contentType + ';base64,' + iconRow.data.toString('base64'),
            iconSize: [iconRow.width, iconRow.height], // size of the icon
            iconAnchor: [Math.round(iconRow.anchorU * iconRow.width), Math.round(iconRow.anchorV * iconRow.height)] // point of the icon which will correspond to marker's location
          })
          layer = vendor.L.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {icon: icon})
          layer.feature = feature
        } else if (!_.isNil(styleRow)) {
          let style = {
            fillColor: styleRow.getFillHexColor(),
            fillOpacity: styleRow.getFillOpacity(),
            color: styleRow.getHexColor(),
            opacity: styleRow.getOpacity(),
            radius: styleRow.getWidth()
          }
          layer = new vendor.L.GeoJSON(feature, {
            pointToLayer: function (feature, latlng) {
              let marker = vendor.L.circleMarker(latlng, style)
              marker.feature = feature
              return marker
            }
          })
        }
      } else {
        if (_.isNil(styleRow)) {
          styleRow = GeoPackageUtilities.getTableStyle(drawingModel._geopackage, drawingModel.sourceLayerName, geometryType)
        }
        let style = {
          color: styleRow.getHexColor(),
          opacity: styleRow.getOpacity(),
          weight: styleRow.getWidth()
        }
        layer = new vendor.L.GeoJSON(feature, {style: style})
      }
      layer.id = feature.id
      mapLayer.addLayer(layer)
    })
    drawingModel.close()
    return mapLayer
  }
}
