import {L} from '../../../lib/leaflet/vendor'
import EventBus from '../../../lib/vue/EventBus'
import accentMarker from '../../../lib/leaflet/map/markers/marker-accent-blank-icon.png'
import accentMarker2x from '../../../lib/leaflet/map/markers/marker-accent-blank-icon-2x.png'
import marker from '../../../lib/leaflet/map/markers/marker-icon-blank.png'
import marker2x from '../../../lib/leaflet/map/markers/marker-icon-blank-2x.png'
import {getMaterialDesignIcon} from '../../../lib/util/nominatim/TypeCategoryMaterialDesignIcons'
import {SEARCH_RESULT_POINTS_ONLY_PANE, SEARCH_RESULTS_PANE} from '../../../lib/leaflet/map/panes/MapPanes'
import {getDefaultIcon, getSvgMarkerIconData} from '../../../lib/util/style/BrowserStyleUtilities'
import {getDefaultMapCacheStyle} from '../../../lib/util/style/CommonStyleUtilities'
import {prettyifyWords} from '../../../lib/util/nominatim/NominatimUtilities'
import {fetchImage} from '../../../lib/network/BrowserNetworkUtilities'

export default {
  data () {
    return {
      defaultIcon: (glyph) => L.icon.materialDesignIcon({
        iconUrl: marker,
        iconRetinaUrl: marker2x,
        glyphSvg: glyph
      }),
      accentIcon: (glyph) => L.icon.materialDesignIcon({
        iconUrl: accentMarker,
        iconRetinaUrl: accentMarker2x,
        glyphSvg: glyph
      }),
      highlightedLayer: null,
      hoveredSearchResult: null,
      hoveredSearchResultCloseTimeoutId: null,
      searchResultClose: () => {},
      searchResultToSave: null
    }
  },
  methods: {
    highlightAssociatedFeature (layer, highlighted = false) {
      if (this.searchResultLayers) {
        this.searchResultLayers.nonPointFeatures.eachLayer((l) => {
          if (l.setStyle && l.feature.properties.osm_id === layer.feature.properties.osm_id) {
            l.setStyle(highlighted ? {color: '#37A5AC', fillColor: '#37A5AC'} : {color: '#326482', fillColor: '#326482'})
          }
        })
      }
    },
    removeHighlight (layer) {
      if (layer != null) {
        layer.setIcon(this.defaultIcon(getMaterialDesignIcon(layer.feature.properties.type, layer.feature.properties.category)))
        this.highlightAssociatedFeature(layer, false)
      }
    },
    highlightLayer(layer, highlight = false) {
      this.removeHighlight(this.highlightedLayer)
      this.highlightedLayer = null
      if (highlight) {
        this.highlightedLayer = layer
        layer.setIcon(this.accentIcon(getMaterialDesignIcon(layer.feature.properties.type, layer.feature.properties.category)))
        this.highlightAssociatedFeature(layer, true)
      } else {
        this.removeHighlight(layer)
      }
    },
    cancelSearchResultPopupClose () {
      if (this.hoveredSearchResultCloseTimeoutId != null) {
        clearTimeout(this.hoveredSearchResultCloseTimeoutId)
      }
    },
  },
  mounted () {
    EventBus.$on(EventBus.EventTypes.HIGHLIGHT_NOMINATIM_SEARCH_RESULT_ON_MAP, (osmId, highlight) => {
      if (this.searchResultLayers != null) {
        this.searchResultLayers.pointFeatures.eachLayer((layer) => {
          if (layer.feature.properties.osm_id === osmId) {
            this.highlightLayer(layer, highlight)
          }
        })
      }
    })
    EventBus.$on(EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS, () => {
      if (this.searchResultLayers != null) {
        this.map.removeLayer(this.searchResultLayers.pointFeatures)
        this.map.removeLayer(this.searchResultLayers.nonPointFeatures)
        this.searchResultLayers = null
        if (this.layerOrder.length === 0) {
          this.activeLayersControl.disable()
        }
      }
    })
    EventBus.$on(EventBus.EventTypes.NOMINATIM_SEARCH_RESULTS, (data) => {
      if (data != null && data.featureCollection != null && data.featureCollection.features.length > 0) {
        if (this.searchResultLayers != null) {
          this.map.removeLayer(this.searchResultLayers.pointFeatures)
          this.map.removeLayer(this.searchResultLayers.nonPointFeatures)
        }
        const nonPointFeatureCollection = {
          type: 'FeatureCollection',
          features: data.featureCollection.features.filter(feature => feature.geometry.type !== 'Point' && feature.geometry.type !== 'MultiPoint')
        }
        const pointFeatureCollection = {
          type: 'FeatureCollection',
          features: data.featureCollection.features.filter(feature => feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint').concat(nonPointFeatureCollection.features.map(feature => {
            return {
              type: 'Feature',
              bbox: feature.bbox,
              geometry: feature.center_point,
              properties: feature.properties
            }
          }))
        }
        this.searchResultLayers = {
          pointFeatures: L.geoJSON(pointFeatureCollection, {
            pmIgnore: true,
            snapIgnore: false,
            pane: SEARCH_RESULT_POINTS_ONLY_PANE.name,
            zIndex: SEARCH_RESULT_POINTS_ONLY_PANE.zIndex,
            style: {
              color: '#326482',
              fillColor: '#326482'
            },
            onEachFeature: (feature, layer) => {
              layer.setIcon(this.defaultIcon(getMaterialDesignIcon(feature.properties.type, feature.properties.category)))
              layer.on('click', (e) => {
                EventBus.$emit(EventBus.EventTypes.SHOW_NOMINATIM_SEARCH_RESULT, e.target.feature.properties.osm_id)
                this.highlightLayer(layer, true)
              })
              layer.on('mouseout', () => {
                if (this.searchResultClose) {
                  this.searchResultClose()
                }
              })
              layer.on('mouseover', (e) => {
                this.cancelSearchResultPopupClose()
                let targetFeature = e.target.feature
                this.searchResultLayers.nonPointFeatures.eachLayer((l) => {
                  if (l.feature.properties.osm_id === targetFeature.properties.osm_id) {
                    targetFeature = l.feature
                  }
                })
                this.hoveredSearchResult = targetFeature
                if (!layer.isPopupOpen()) {
                  this.$nextTick(() => {
                    layer.bindPopup(this.$refs.searchResultPopup.$el, {minWidth: 300, closeButton: false, maxWidth: 300, maxHeight: 250, closeOnClick: false, className: 'search-popup'}).openPopup(layer, e.latlng)
                    this.searchResultClose = () => {
                      this.hoveredSearchResultCloseTimeoutId = setTimeout(() => {
                        this.hoveredSearchResultCloseTimeoutId = null
                        layer.closePopup()
                        layer.unbindPopup()
                        this.searchResultClose = () => {}
                      }, 250)
                    }
                  })
                }
              })
            }
          }),
          nonPointFeatures: L.geoJSON(nonPointFeatureCollection, {
            pmIgnore: true,
            snapIgnore: false,
            pane: SEARCH_RESULTS_PANE.name,
            zIndex: SEARCH_RESULTS_PANE.zIndex,
            style: {
              color: '#326482',
              fillColor: '#326482'
            },
            onEachFeature: (feature, layer) => {
              layer.on('click', (e) => {
                EventBus.$emit(EventBus.EventTypes.SHOW_NOMINATIM_SEARCH_RESULT, e.target.feature.properties.osm_id)
              })
            }
          })
        }
        this.map.addLayer(this.searchResultLayers.nonPointFeatures)
        this.map.addLayer(this.searchResultLayers.pointFeatures)
        if (data.fitMapToData) {
          const dataBounds = this.searchResultLayers.nonPointFeatures.getBounds().extend(this.searchResultLayers.pointFeatures.getBounds()).pad(0.05)
          this.map.fitBounds(dataBounds)
        }
        this.activeLayersControl.enable(this.layerOrder.length)
      } else if (this.searchResultLayers != null) {
        this.searchResultLayers = null
        if (this.layerOrder.length === 0) {
          this.activeLayersControl.disable()
        }
      }
    })
    EventBus.$on(EventBus.EventTypes.SAVE_NOMINATIM_SEARCH_RESULT, async (geojson, image) => {
      const geojsonClone = Object.assign({}, geojson)
      const centerPoint = geojsonClone.center_point
      delete geojsonClone.center_point
      this.searchResultToSave = {
        feature: geojsonClone,
        pointFeature: null
      }
      if (centerPoint != null) {
        this.searchResultToSave.pointFeature = Object.assign({}, geojsonClone)
        this.searchResultToSave.pointFeature.geometry = centerPoint
      }
      let icon
      const style = getDefaultMapCacheStyle()
      const materialIcon = getMaterialDesignIcon(geojsonClone.properties.type, geojsonClone.properties.category)
      if (materialIcon != null) {
        icon = await getSvgMarkerIconData(prettyifyWords(geojsonClone.properties.type, true) + ' - ' + prettyifyWords(geojsonClone.properties.category, true), materialIcon)
      } else {
        icon = await getDefaultIcon('Default', 'Default icon for MapCache')
      }
      if (this.searchResultToSave.feature.geometry.type === 'Point' || this.searchResultToSave.feature.geometry.type === 'MultiPoint') {
        this.searchResultToSave.feature.style = { icon: icon }
      } else {
        this.searchResultToSave.feature.style = { style: style }
      }
      if (this.searchResultToSave.pointFeature != null) {
        this.searchResultToSave.pointFeature.style = { icon: icon }
      }
      if (image != null) {
        const attachment = await fetchImage(image)
        this.searchResultToSave.feature.attachment = attachment
        if (this.searchResultToSave.pointFeature != null) {
          this.searchResultToSave.pointFeature.attachment = attachment
        }
      }
      this.displayGeoPackageFeatureLayerSelection()
    })
  },
  beforeDestroy () {
    EventBus.$off([EventBus.EventTypes.HIGHLIGHT_NOMINATIM_SEARCH_RESULT_ON_MAP, EventBus.EventTypes.CLEAR_NOMINATIM_SEARCH_RESULTS, EventBus.EventTypes.NOMINATIM_SEARCH_RESULTS, EventBus.EventTypes.SAVE_NOMINATIM_SEARCH_RESULT])
  }
}
