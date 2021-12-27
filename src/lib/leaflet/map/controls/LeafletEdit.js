/* eslint-disable no-empty */
import {L} from '../../vendor'
import keys from 'lodash/keys'
import cloneDeep from 'lodash/cloneDeep'
import {EDITING_PANE} from '../panes/MapPanes'
import {explodeFlattenedFeature, flattenFeature, isRectangle} from '../../../util/geojson/GeoJSONUtilities'
import bbox from '@turf/bbox'

export default class LeafletEdit extends L.Control {
  constructor (options) {
    let mergedOptions = {
      ...{
        position: 'topleft',
        enabled: true
      },
      ...options
    }
    super(mergedOptions)
  }

  isEditing () {
    return this.editingLayer != null
  }

  addTooltip () {
    const tooltip = L.DomUtil.get('tooltip')
    tooltip.innerHTML = 'Edit the feature\'s geometry'
    tooltip.style.display = 'block'
  }

  removeTooltip () {
    const tooltip = L.DomUtil.get('tooltip')
    tooltip.innerHTML = ''
    tooltip.style.display = 'none'
  }

  onAdd () {
    let container = L.DomUtil.create('div', 'leaflet-bar leaflet-touch leaflet-control hidden')

    this.show = function () {
      if (L.DomUtil.hasClass(container, 'hidden')) {
        L.DomUtil.removeClass(container, 'hidden')
      }
    }

    this.hide = function () {
      L.DomUtil.addClass(container, 'hidden')
    }

    this.editFeature = function (map, editingFeature) {
      this.id = editingFeature.id
      this.feature = editingFeature
      this.feature.type = 'Feature'

      this.addTooltip()
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

    this.completeEditing = function () {
      this.removeTooltip()
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
      this.editingLayer.remove()
      this.editingLayer = null
      return this.feature
    }

    return container
  }
}
