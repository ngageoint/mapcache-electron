/* eslint-disable no-empty */
import {L} from '../../vendor'
import isNil from 'lodash/isNil'
import keys from 'lodash/keys'
import cloneDeep from 'lodash/cloneDeep'
import {EDITING_PANE} from '../panes/MapPanes'
import {explodeFlattenedFeature, flattenFeature, isRectangle} from '../../../util/geojson/GeoJSONUtilities'
import bbox from '@turf/bbox'

export default class LeafletEdit extends L.Control {
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

  isEditing () {
    return this.editingLayer != null
  }

  onAdd (map) {
    let container = L.DomUtil.create('div', 'leaflet-bar leaflet-touch leaflet-control hidden')
    this._saveLink = L.DomUtil.create('a', '', container)
    this._cancelLink = L.DomUtil.create('a', 'warning--text', container)
    this._saveLink.title = 'Save'
    this._saveLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="24" height="24" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fill="currentColor" d="M17 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V7L17 3M19 19H5V5H16.17L19 7.83V19M12 12C10.34 12 9 13.34 9 15S10.34 18 12 18 15 16.66 15 15 13.66 12 12 12M6 6H15V10H6V6Z" /></svg>`
    this._cancelLink.title = 'Cancel'
    this._cancelLink.innerHTML = `<svg style="margin-top: 3px;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" preserveAspectRatio="xMidYMid meet" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>`

    this.show = function () {
      if (L.DomUtil.hasClass(container, 'hidden')) {
        L.DomUtil.removeClass(container, 'hidden')
      }
    }

    this.hide = function () {
      L.DomUtil.addClass(container, 'hidden')
    }

    this.editFeature = function (map, projectId, editingFeature) {
      if (!isNil(this.feature) && (this.feature.id !== editingFeature.featureToEdit.id || this.tableName !== editingFeature.tableName || this.id !== editingFeature.id)) {
        this.cancelEdit()
      } else if (isNil(this.editingLayer)) {
        this.projectId = projectId
        this.id = editingFeature.id
        this.isGeoPackage = editingFeature.isGeoPackage
        this.tableName = editingFeature.tableName
        this.feature = cloneDeep(editingFeature.featureToEdit)
        this.feature.type = 'Feature'

        if (isRectangle(this.feature.geometry)) {
          const bounds = bbox(this.feature)
          this.editingLayer = L.rectangle([[bounds[1], bounds[0]], [bounds[3], bounds[2]]])
          this.editingLayer.editing.enable()
          this.editingLayer.addTo(map)
          this.featureIsRectangle = true
        } else {
          this.featureIsRectangle = false
          let flattenResults = flattenFeature(this.feature)
          this.featureContainer = flattenResults.container
          let featureCollection = {
            type: 'FeatureCollection',
            features: flattenResults.features
          }

          this.editingLayer = L.geoJSON(featureCollection, {
            pane: EDITING_PANE.name,
            zIndex: EDITING_PANE.zIndex,
            pointToLayer: function (geojson, latlng) {
              return new L.Marker(latlng, {draggable: true})
            },
            onEachFeature: function (featureData, layer) {
              try {
                if (layer._layers) {
                  const layerKeys = keys(layer._layers)
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
    }

    this.cancelEdit = function () {
      if (!isNil(this.editingLayer)) {
        map.removeLayer(this.editingLayer)
      }
      window.mapcache.clearEditFeatureGeometry({projectId: this.projectId})
      this.editingLayer = null
      this.projectId = null
      this.id = null
      this.isGeoPackage = null
      this.tableName = null
      this.feature = null
      this.featureContainer = null
      this.featureIsRectangle = false
    }

    this._saveLink.onclick = function (e) {
      if (!isNil(this.editingLayer)) {
        if (this.featureIsRectangle) {
          this.feature.geometry = this.editingLayer.toGeoJSON(10).geometry
        } else {
          let layers = this.editingLayer.getLayers()
          this.feature.geometry = explodeFlattenedFeature(this.featureContainer, layers.map(layer => {
            let feature = cloneDeep(layer.feature)
            if (window.mapcache.GeometryType.fromName(layer.feature.geometry.type.toUpperCase()) === window.mapcache.GeometryType.POINT) {
              feature.geometry.coordinates = [layer._latlng.lng, layer._latlng.lat]
            } else {
              feature.geometry = layer.toGeoJSON(10).geometry
            }
            return feature
          }))
        }
        window.mapcache.updateFeatureGeometry({projectId: this.projectId, id: this.id, isGeoPackage: this.isGeoPackage, tableName: this.tableName, featureGeoJson: this.feature})
      }
      this.cancelEdit()
      e.stopPropagation()
      e.preventDefault()
    }.bind(this)

    this._cancelLink.onclick = function (e) {
      this.cancelEdit()
      e.stopPropagation()
      e.preventDefault()
    }.bind(this)

    return container
  }
}
