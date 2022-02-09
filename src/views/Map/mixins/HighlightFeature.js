import {L} from '../../../lib/leaflet/vendor'
import EventBus from '../../../lib/vue/EventBus'
import {SEARCH_RESULTS_PANE} from '../../../lib/leaflet/map/panes/MapPanes'
import {adjustColorForHighlight} from '../../../lib/util/style/CommonStyleUtilities'

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
      if (this.hoveredFeatureLayer == null || this.hoveredFeatureLayer.id !== id || this.hoveredFeatureLayer.tableName !== tableName || this.hoveredFeatureLayer.feature.id !== feature.id) {
        this.removeGeoPackageFeatureHighlight()
        if (filePath != null && tableName != null && feature != null) {
          this.hoveredFeatureLayer = {
            id: id,
            isGeoPackage: isGeoPackage,
            filePath: filePath,
            tableName: tableName,
            feature: feature
          }
          const style = await window.mapcache.getFeatureStyleOrIcon(filePath, tableName, feature.id)
          if (style.icon) {
            const customIcon = L.icon({
              iconUrl: style.icon.url,
              iconSize: [style.icon.width * 1.10, style.icon.height * 1.10],
              iconAnchor: [style.icon.width * 1.10 * style.icon.anchorU, style.icon.height * 1.10 * style.icon.anchorV],
              className: 'darken'
            })
            const pressedIcon = L.icon({
              iconUrl: style.icon.url,
              iconSize: [style.icon.width * 1.10, style.icon.height * 1.10],
              iconAnchor: [style.icon.width * 1.10 * style.icon.anchorU, style.icon.height * 1.10 * style.icon.anchorV],
              className: 'pressed'
            })
            this.hoveredFeature = L.geoJSON(feature, {
              pointToLayer: function (feature, latlng) {
                return L.marker(latlng, { icon: customIcon })
              },
              pane: SEARCH_RESULTS_PANE.name,
              zIndex: SEARCH_RESULTS_PANE.zIndex
            })
            this.hoveredFeature.eachLayer((layer) => {
              layer.on('click', () => {
                EventBus.$emit(EventBus.EventTypes.SHOW_FEATURE, id, isGeoPackage, tableName, feature.id)
              })
              layer.on('mousedown', () => {
                layer.setIcon(pressedIcon)
              })
              layer.on('mouseup', () => {
                layer.setIcon(customIcon)
              })
            })
          } else if (style.style) {
            let newOutlineColor = adjustColorForHighlight(style.style.color, 10)
            let newFillColor = adjustColorForHighlight(style.style.fillColor, 10)
            let pressedOutlineColor = adjustColorForHighlight(style.style.color, 40)
            let pressedFillColor = adjustColorForHighlight(style.style.fillColor, 40)

            this.hoveredFeature = L.geoJSON(feature, {
              pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                  radius: style.style.width / 2.0 + 2,
                  fillColor: newFillColor,
                  color: newOutlineColor,
                  weight: 0,
                  opacity: style.style.opacity,
                  fillOpacity: style.style.opacity
                })
              },
              pane: SEARCH_RESULTS_PANE.name,
              zIndex: SEARCH_RESULTS_PANE.zIndex
            })

            this.hoveredFeature.eachLayer((layer) => {
              if (layer.feature.geometry.type !== 'Point' && layer.feature.geometry.type !== 'MultiPoint') {
                layer.setStyle({color: newOutlineColor, opacity: style.style.opacity, fillColor: newFillColor, weight: style.style.width / 2.0 + 2, fillOpacity: style.style.fillOpacity})
                layer.on('mousedown', () => {
                  layer.setStyle({color: pressedOutlineColor, opacity: style.style.opacity, fillColor: pressedFillColor, weight: style.style.width / 2.0 + 4, fillOpacity: style.style.fillOpacity})
                })
                layer.on('mouseup', () => {
                  layer.setStyle({color: newOutlineColor, opacity: style.style.opacity, fillColor: newFillColor, weight: style.style.width / 2.0 + 2, fillOpacity: style.style.fillOpacity})
                })
              }
              layer.on('click', () => {
                EventBus.$emit(EventBus.EventTypes.SHOW_FEATURE, id, isGeoPackage, tableName, feature.id)
              })
            })
          }
          this.hoveredFeature.addTo(this.map)
        }
      }
    }
  },
  mounted () {

  },
  beforeDestroy () {

  }
}
