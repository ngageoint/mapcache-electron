/* eslint-disable no-empty */
import * as vendor from '../../lib/vendor'
import _ from 'lodash'
import ActionUtilities from '../../lib/ActionUtilities'
import { GeometryType } from '@ngageoint/geopackage'

export default class LeafletEdit extends vendor.L.Control {
  constructor (options) {
    let mergedOptions = {
      ...{
        position: 'topright',
        enabled: true
      },
      ...options
    }
    super(mergedOptions)
  }

  onAdd (map) {
    let container = vendor.L.DomUtil.create('div', 'leaflet-bar leaflet-touch leaflet-control hidden')
    this._saveLink = vendor.L.DomUtil.create('a', 'leaflet-control-edit-save', container)
    this._cancelLink = vendor.L.DomUtil.create('a', 'leaflet-control-draw-cancel', container)
    this._saveLink.title = 'Save'
    this._cancelLink.title = 'Cancel'


    this.show = function () {
      if (vendor.L.DomUtil.hasClass(container, 'hidden')) {
        vendor.L.DomUtil.removeClass(container, 'hidden')
      }
    }

    this.hide = function () {
      vendor.L.DomUtil.addClass(container, 'hidden')
    }

    this.editFeature = function (map, projectId, editingFeature) {
      if (!_.isNil(this.feature) && (this.feature.id !== editingFeature.featureToEdit.id || this.tableName !== editingFeature.tableName || this.id !== editingFeature.id)) {
        this.cancelEdit()
      } else if (_.isNil(this.editingLayer)) {
        this.projectId = projectId
        this.id = editingFeature.id
        this.isGeoPackage = editingFeature.isGeoPackage
        this.tableName = editingFeature.tableName
        this.feature = _.cloneDeep(editingFeature.featureToEdit)
        this.feature.type = 'Feature'
        this.editingLayer = vendor.L.geoJSON(this.feature, {
          pane: 'markerPane',
          zIndex: '501',
          pointToLayer: function (geojson, latlng) {
            return new vendor.L.Marker(latlng, {draggable: true})
          },
          onEachFeature: function (featureData, layer) {
            try {
              if (layer._layers) {
                const layerKeys = _.keys(layer._layers)
                for (let i = 0; i < layerKeys.length; i++) {
                  try {
                    layer._layers[layerKeys[i]].editing.enable()
                  } catch (e) {}
                }
              }
              layer.editing.enable()
            } catch (e) {}
          }
        }).addTo(map)
      }
    }

    this.cancelEdit = function () {
      if (!_.isNil(this.editingLayer)) {
        map.removeLayer(this.editingLayer)
      }
      ActionUtilities.clearEditFeatureGeometry({projectId: this.projectId})
      this.editingLayer = null
      this.projectId = null
      this.id = null
      this.isGeoPackage = null
      this.tableName = null
      this.feature = null
    }

    this._saveLink.onmousedown = function (e) {
      if (!_.isNil(this.editingLayer)) {
        let layers = this.editingLayer.getLayers()
        switch (GeometryType.fromName(this.feature.geometry.type.toUpperCase())) {
          case GeometryType.POINT:
            this.feature.geometry.coordinates = [layers[0]._latlng.lng, layers[0]._latlng.lat]
            break
          default:
            this.feature.geometry = layers[0].toGeoJSON(10).geometry
            break
        }

        ActionUtilities.updateFeatureGeometry({projectId: this.projectId, id: this.id, isGeoPackage: this.isGeoPackage, tableName: this.tableName, featureGeoJson: this.feature})
      }
      this.cancelEdit()
      e.stopPropagation()
      e.preventDefault()
    }.bind(this)

    this._cancelLink.onmousedown = function (e) {
      this.cancelEdit()
      e.stopPropagation()
      e.preventDefault()
    }.bind(this)

    return container
  }
}
