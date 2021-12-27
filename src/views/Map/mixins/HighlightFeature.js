import {L} from '../../../lib/leaflet/vendor'

export default {
  methods: {
    removeGeoPackageFeatureHighlight () {
      if (this.hoveredFeature && this.map) {

        this.map.removeLayer(this.hoveredFeature)
        this.hoveredFeature = undefined
      }
    },
    async highlightGeoPackageFeature (filePath, tableName, feature) {
      this.removeGeoPackageFeatureHighlight()
      if (filePath != null && tableName != null && feature != null) {
        const style = await window.mapcache.getFeatureStyleOrIcon(filePath, tableName, feature.id)
        if (style.icon) {
          const customIcon = L.icon({
            iconUrl: style.icon.url,
            iconSize: [style.icon.width * 1.25, style.icon.height * 1.25],
            iconAnchor: [style.icon.width * 1.25 * style.icon.anchorU, style.icon.height * 1.25 * style.icon.anchorV]
          })
          this.hoveredFeature = L.geoJSON(feature, {
            pointToLayer: function (feature, latlng) {
              return L.marker(latlng, { icon: customIcon })
            }
          })
        } else if (style.style) {
          this.hoveredFeature = L.geoJSON(feature, {
            pointToLayer: function (feature, latlng) {
              return L.circleMarker(latlng, {
                radius: style.style.width / 2.0 + 2,
                fillColor: style.style.color,
                color: style.style.color,
                weight: 0,
                opacity: style.style.opacity,
                fillOpacity: style.style.opacity
              })
            }
          })
          this.hoveredFeature.eachLayer(function (layer) {
            if (layer.feature.geometry.type !== 'Point' ) {
              layer.setStyle({color: style.style.color, opacity: style.style.opacity, fillColor: style.style.fillColor, weight: style.style.width / 2.0 + 2, fillOpacity: style.style.fillOpacity})
            }
          })
        }
        this.hoveredFeature.addTo(this.map)
      }
    }
  },
  mounted () {

  },
  beforeDestroy () {

  }
}
