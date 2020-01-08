import * as vendor from '../../vendor'
import _ from 'lodash'
import GeoPackageUtilities from '../../GeoPackageUtilities'

export default class DrawingMapLayer {
  static constructMapLayer (drawingModel) {
    let mapLayer = new vendor.L.LayerGroup()
    mapLayer.id = drawingModel.id
    mapLayer.clearLayers()
    drawingModel.featureCollection.features.forEach(feature => {
      feature.properties.layerId = drawingModel.id
      feature.properties.featureId = feature.id
      let styleRow = GeoPackageUtilities.getFeatureStyleRow(drawingModel._geopackage, drawingModel.sourceLayerName, feature.id, feature.geometry.type)
      let layer
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        let style = {
          fillColor: styleRow.getFillHexColor(),
          fillOpacity: styleRow.getFillOpacity(),
          color: styleRow.getHexColor(),
          opacity: styleRow.getOpacity(),
          weight: styleRow.getWidth()
        }
        layer = new vendor.L.GeoJSON(feature, {style: style})
      } else if (feature.geometry.type === 'Point') {
        let iconRow = GeoPackageUtilities.getFeatureIconRow(drawingModel._geopackage, drawingModel.sourceLayerName, feature.id, feature.geometry.type)
        if (!_.isNil(iconRow)) {
          let icon = vendor.L.icon({
            iconUrl: 'data:' + iconRow.getContentType() + ';base64,' + iconRow.getData().toString('base64'),
            iconSize: [iconRow.getWidth(), iconRow.getHeight()], // size of the icon
            iconAnchor: [Math.round(iconRow.getAnchorU() * iconRow.getWidth()), Math.round(iconRow.getAnchorV() * iconRow.getHeight())] // point of the icon which will correspond to marker's location
          })
          layer = vendor.L.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {icon: icon})
          layer.feature = feature
        } else {
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
    return mapLayer
  }
}
