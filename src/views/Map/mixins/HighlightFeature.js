import { L } from '../../../lib/leaflet/vendor'
import EventBus from '../../../lib/vue/EventBus'
import { OVERLAY_PANE_FEATURES } from '../../../lib/leaflet/map/panes/MapPanes'
import { adjustColorForHighlight } from '../../../lib/util/style/CommonStyleUtilities'

export default {
  data () {
    return {
      hoveredFeature: null,
      hoveredFeatureLayer: {}
    }
  },
  methods: {
    removeGeoPackageFeatureHighlight () {
      if (this.hoveredFeature && this.map) {
        this.map.removeLayer(this.hoveredFeature)
        this.hoveredFeature = null
        this.hoveredFeatureLayer = {}
      }
    },
    async highlightGeoPackageFeature (id, isGeoPackage, filePath, tableName, feature) {
      if (this.hoveredFeatureLayer == null || this.hoveredFeatureLayer.id !== id || this.hoveredFeatureLayer.tableName !== tableName || this.hoveredFeatureLayer.feature == null || this.hoveredFeatureLayer.feature.id !== feature.id) {
        this.removeGeoPackageFeatureHighlight()
        if (filePath != null && tableName != null && feature != null && feature.geometry != null) {
          this.hoveredFeatureLayer = {
            id: id,
            isGeoPackage: isGeoPackage,
            filePath: filePath,
            tableName: tableName,
            feature: feature
          }
          const style = await window.mapcache.getFeatureStyleOrIcon(filePath, tableName, feature.id)
          if (style.icon) {
            const adjustmentFactor = this.isDrawing || this.isEditing ? 1.0 : 1.10
            const customIcon = L.icon({
              iconUrl: style.icon.url,
              iconSize: [style.icon.width * adjustmentFactor, style.icon.height * adjustmentFactor],
              iconAnchor: [style.icon.width * adjustmentFactor * style.icon.anchorU, style.icon.height * adjustmentFactor * style.icon.anchorV],
              className: 'darken'
            })
            const pressedIcon = L.icon({
              iconUrl: style.icon.url,
              iconSize: [style.icon.width * adjustmentFactor, style.icon.height * adjustmentFactor],
              iconAnchor: [style.icon.width * adjustmentFactor * style.icon.anchorU, style.icon.height * adjustmentFactor * style.icon.anchorV],
              className: 'pressed'
            })
            this.hoveredFeature = L.geoJSON(feature, {
              pmIgnore: true,
              snapIgnore: false,
              pointToLayer: (feature, latlng) => {
                const markerLayer = L.marker(latlng, { icon: customIcon, pmIgnore: true, snapIgnore: false })
                if (!this.isDrawing && !this.isEditing) {
                  markerLayer.on('mousedown', () => {
                    markerLayer.setIcon(pressedIcon)
                  })
                  markerLayer.on('mouseup', () => {
                    markerLayer.setIcon(customIcon)
                  })
                }
                return markerLayer
              },
              pane: OVERLAY_PANE_FEATURES.name,
              zIndex: OVERLAY_PANE_FEATURES.zIndex
            })
            this.hoveredFeature.eachLayer((layer) => {
              layer.on('click', () => {
                if (!this.isDrawing && !this.isEditing) {
                  EventBus.$emit(EventBus.EventTypes.SHOW_FEATURE, id, isGeoPackage, tableName, feature.id)
                }
              })
            })
          } else if (style.style) {
            let newOutlineColor = adjustColorForHighlight(style.style.color, 10)
            let newFillColor = adjustColorForHighlight(style.style.fillColor, 10)
            let pressedOutlineColor = adjustColorForHighlight(style.style.color, 40)
            let pressedFillColor = adjustColorForHighlight(style.style.fillColor, 40)

            const newWeight = this.isDrawing || this.isEditing ? (style.style.width / 2.0) : (style.style.width / 2.0 + 2)
            const newWeightMouseDown = this.isDrawing || this.isEditing ? (style.style.width / 2.0) : (style.style.width / 2.0 + 4)
            const newOpacity = this.isDrawing || this.isEditing ? 0.0 : style.style.opacity
            const newFillOpacity = this.isDrawing || this.isEditing ? 0.0 : style.style.fillOpacity

            this.hoveredFeature = L.geoJSON(feature, {
              pmIgnore: true,
              snapIgnore: false,
              pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                  pmIgnore: true,
                  snapIgnore: false,
                  radius: newWeight,
                  fillColor: newFillColor,
                  color: newOutlineColor,
                  weight: 0,
                  opacity: newOpacity,
                  fillOpacity: newOpacity
                })
              },
              pane: OVERLAY_PANE_FEATURES.name,
              zIndex: OVERLAY_PANE_FEATURES.zIndex
            })

            this.hoveredFeature.eachLayer((layer) => {
              if (layer.feature.geometry.type !== 'Point' && layer.feature.geometry.type !== 'MultiPoint') {
                layer.setStyle({
                  color: newOutlineColor,
                  opacity: newOpacity,
                  fillColor: newFillColor,
                  weight: newWeight,
                  fillOpacity: newFillOpacity
                })
                layer.on('mousedown', () => {
                  layer.setStyle({
                    color: pressedOutlineColor,
                    opacity: newOpacity,
                    fillColor: pressedFillColor,
                    weight: newWeightMouseDown,
                    fillOpacity: newFillOpacity
                  })
                })
                layer.on('mouseup', () => {
                  layer.setStyle({
                    color: newOutlineColor,
                    opacity: newOpacity,
                    fillColor: newFillColor,
                    weight: newWeight,
                    fillOpacity: newFillOpacity
                  })
                })
              }
              layer.on('click', () => {
                if (!this.isDrawing && !this.isEditing) {
                  EventBus.$emit(EventBus.EventTypes.SHOW_FEATURE, id, isGeoPackage, tableName, feature.id)
                }
              })
            })
          }
          this.hoveredFeature.addTo(this.map)
        }
      }
    }
  }
}
