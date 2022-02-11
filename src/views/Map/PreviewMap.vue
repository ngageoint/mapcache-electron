<template>
  <div v-show="visible" :style="{width: '100%', height: '100%', zIndex: 1, position: 'relative', display: 'flex'}">
    <div id="map-preview" :style="{width: '100%',  zIndex: 1, flex: 1, border: '8px solid #39FF14', backgroundColor: mapBackground}">
    </div>
    <v-card outlined v-if="showBaseMapSelection" class="preview-basemap-card">
      <v-card-title class="pb-2">
        Base maps
      </v-card-title>
      <v-card-text class="pb-2">
        <v-card-subtitle class="pt-1 pb-1">
          Select a base map.
        </v-card-subtitle>
        <v-list dense class="pa-0" style="max-height: 200px; overflow-y: auto;">
          <v-list-item-group v-model="selectedBaseMapId" mandatory>
            <v-list-item v-for="item of baseMapItems" :key="item.id + '-basemap'" :value="item.id">
              <v-list-item-icon style="margin-right: 16px;">
                <v-btn style="width: 24px; height: 24px;" icon @click.stop="(e) => item.zoomTo(e)">
                  <v-icon small>{{mdiMapOutline}}</v-icon>
                </v-btn>
              </v-list-item-icon>
              <v-list-item-title>{{item.name}}</v-list-item-title>
              <base-map-troubleshooting v-if="item.baseMap.error" :base-map="item.baseMap"></base-map-troubleshooting>
              <geo-t-i-f-f-troubleshooting v-if="item.missingRaster" :source-or-base-map="item.baseMap"></geo-t-i-f-f-troubleshooting>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import isNil from 'lodash/isNil'
import keys from 'lodash/keys'
import pick from 'lodash/pick'
import isEqual from 'lodash/isEqual'
import debounce from 'lodash/debounce'
import { mapState } from 'vuex'
import LeafletZoomIndicator from '../../lib/leaflet/map/controls/LeafletZoomIndicator'
import LeafletActiveLayersTool from '../../lib/leaflet/map/controls/LeafletActiveLayersTool'
import LeafletBaseMapTool from '../../lib/leaflet/map/controls/LeafletBaseMapTool'
import LeafletCoordinates from '../../lib/leaflet/map/controls/LeafletCoordinates'
import BaseMapTroubleshooting from '../BaseMaps/BaseMapTroubleshooting'
import { mdiMapOutline } from '@mdi/js'
import { L } from '../../lib/leaflet/vendor'
import { constructMapLayer } from '../../lib/leaflet/map/layers/LeafletMapLayerFactory'
import { constructLayer } from '../../lib/layer/LayerFactory'
import {getDefaultBaseMaps, getOfflineBaseMapId} from '../../lib/util/basemaps/BaseMapUtilities'
import { isRemote } from '../../lib/layer/LayerTypes'
import { connectToBaseMap } from '../../lib/network/ServiceConnectionUtils'
import GeoTIFFTroubleshooting from '../Common/GeoTIFFTroubleshooting'
import DrawBounds from './mixins/DrawBounds'
import GridBounds from './mixins/GridBounds'
import EventBus from '../../lib/vue/EventBus'
import {zoomToBaseMap, zoomToSource} from '../../lib/leaflet/map/ZoomUtilities'
import {BASE_MAP_PANE, GRID_SELECTION_PANE} from '../../lib/leaflet/map/panes/MapPanes'

export default {
    mixins: [
      DrawBounds,
      GridBounds
    ],
    components: {GeoTIFFTroubleshooting, BaseMapTroubleshooting},
    props: {
      project: Object,
      previewLayer: Object,
      resizeListener: Number,
      visible: Boolean,
      getMapCenterAndZoom: Function,
      darkTheme: Boolean
    },
    data () {
      return {
        mdiMapOutline: mdiMapOutline,
        previewMapLayer: null,
        observer: null,
        mapBackground: navigator.onLine ? '#ddd' : '#C0D9E4',
        showBaseMapSelection: false,
        selectedBaseMapId: navigator.onLine ? '0' : '3',
        baseMapLayers: {},
        offlineBaseMapId: getOfflineBaseMapId(),
        defaultBaseMapIds: getDefaultBaseMaps().map(bm => bm.id),
        notReadOnlyBaseMapFilter: baseMap => !baseMap.readonly,
      }
    },
    computed: {
      ...mapState({
        baseMapItems: state => {
          return getDefaultBaseMaps().concat(state.BaseMaps.baseMaps || []).map(baseMapConfig => {
            return {
              id: baseMapConfig.id,
              baseMap: baseMapConfig,
              name: baseMapConfig.name,
              missingRaster: window.mapcache.isRasterMissing(baseMapConfig.layerConfiguration || {}),
              zoomTo: debounce((e) => {
                e.stopPropagation()
                zoomToBaseMap(baseMapConfig, true)
              }, 100)
            }
          })
        },
        baseMaps: state => {
          return  getDefaultBaseMaps().concat(state.BaseMaps.baseMaps || [])
        }
      })
    },
    methods: {
      addBaseMap (baseMap, map) {
        let self = this
        const baseMapId = baseMap.id
        const defaultBaseMap = getDefaultBaseMaps().find(bm => bm.id === baseMapId)
        if (baseMapId === getOfflineBaseMapId()) {
          self.baseMapLayers[baseMapId] = this.createOfflineBaseMapLayer(baseMap, this.$vuetify.theme.dark)
          if (this.selectedBaseMapId === baseMapId) {
            map.addLayer(self.baseMapLayers[baseMapId])
            this.setAttribution(baseMap.attribution)
            self.baseMapLayers[baseMapId].bringToBack()
          }
        } else if (!isNil(defaultBaseMap)) {
          self.baseMapLayers[baseMapId] = this.createDefaultBaseMapLayer(defaultBaseMap, this.$vuetify.theme.dark)
          if (self.selectedBaseMapId === baseMapId) {
            map.addLayer(self.baseMapLayers[baseMapId])
            this.setAttribution(baseMap.attribution)
            self.baseMapLayers[baseMapId].bringToBack()
          }
        } else {
          let layer = constructLayer(baseMap.layerConfiguration)
          self.baseMapLayers[baseMapId] = constructMapLayer({layer: layer, maxFeatures: self.project.maxFeatures})
          if (self.selectedBaseMapId === baseMapId) {
            map.addLayer(self.baseMapLayers[baseMapId])
            this.setAttribution(baseMap.attribution)
            self.baseMapLayers[baseMapId].bringToBack()
          }
        }
      },
      setAttribution (attribution) {
        if (this.attributionControl) {
          this.map.removeControl(this.attributionControl)
        }
        this.attributionControl = L.control.attribution({
          prefix: false,
          position: 'bottomright',
        })
        this.attributionControl.addAttribution('<a onclick="window.mapcache.openExternal(\'https://leafletjs.com/\')" href="#">Leaflet</a>')
        if (attribution != null) {
          this.attributionControl.addAttribution(attribution)
        }
        this.map.addControl(this.attributionControl)
      },
      initializeMap () {
        const defaultCenter = [39.658748, -104.843165]
        const defaultZoom = 3

        this.map = L.map('map-preview', {
          editable: true,
          attributionControl: false,
          center: defaultCenter,
          zoom: defaultZoom,
          minZoom: 2
        })
        this.map.on('click', () => {
          this.showBaseMapSelection = false
        })
        this.map.setView(defaultCenter, defaultZoom)
        this.map.createPane(BASE_MAP_PANE.name)
        this.map.getPane(BASE_MAP_PANE.name).style.zIndex = BASE_MAP_PANE.zIndex
        this.map.createPane(GRID_SELECTION_PANE.name)
        this.map.getPane(GRID_SELECTION_PANE.name).style.zIndex = GRID_SELECTION_PANE.zIndex
        this.setupControls()
        this.map.setView(defaultCenter, defaultZoom)
        if (!isNil(this.previewLayer)) {
          this.setupPreviewLayer()
        }
      },
      setupBaseMaps () {
        for (let i = 0; i < this.baseMaps.length; i++) {
          this.addBaseMap(this.baseMaps[i], this.map)
        }
      },
      setupControls () {
        let self = this
        this.basemapControl = new LeafletBaseMapTool({}, function () {
          self.showBaseMapSelection = !self.showBaseMapSelection
        })
        this.map.addControl(this.basemapControl)
        this.setupBaseMaps()
        this.map.zoomControl.setPosition('topright')
        this.displayZoomControl = new LeafletZoomIndicator()
        this.map.addControl(this.displayZoomControl)
        this.activeLayersControl = new LeafletActiveLayersTool({}, function () {
          zoomToSource(self.previewLayer, true)
        }, null, null)
        this.map.addControl(this.activeLayersControl)
        this.scaleControl = L.control.scale()
        this.scaleControl.addTo(this.map)
        this.coordinateControl = new LeafletCoordinates()
        this.map.addControl(this.coordinateControl)

      },
      setupPreviewLayer () {
        const layer = constructLayer(this.previewLayer)
        this.previewMapLayer = constructMapLayer({layer: layer, isPreview: true})
        this.previewMapLayer.addTo(this.map)
        this.activeLayersControl.enable()
        this.$nextTick(() => {
          EventBus.$emit(EventBus.EventTypes.PREVIEW_ZOOM_TO, layer.extent, layer.minZoom || 2, layer.maxZoom)
        })
      },
      removePreviewLayer () {
        if (!isNil(this.previewMapLayer)) {
          this.previewMapLayer.remove()
          this.previewMapLayer = null
        }
      },
      createDefaultBaseMapLayer (baseMap, dark = false) {
        return L.tileLayer(baseMap.layerConfiguration.url, {
          pane: BASE_MAP_PANE.name,
          zIndex: BASE_MAP_PANE.zIndex,
          subdomains: baseMap.layerConfiguration.subdomains || [],
          attribution: baseMap.layerConfiguration.attribution || '',
          minZoom: 0,
          maxZoom: 20,
          className: dark ? 'dark' : ''
        })
      },
      createOfflineBaseMapLayer (baseMap, dark = false) {
        let layer = constructLayer({
          id: baseMap.id,
          geopackageFilePath: window.mapcache.getOfflineGeoPackageFilePath(),
          sourceType: 'GeoPackage',
          sourceLayerName: 'basemap',
          layerType: 'Vector',
          styleKey: 0,
          count: 1,
          extent: [-180, -90, 180, 90],
        })
        return constructMapLayer({layer: layer, mapPane: BASE_MAP_PANE.name, zIndex: BASE_MAP_PANE.zIndex, maxFeatures: 5000, className: dark ? 'dark' : ''})
      }
    },
    watch: {
      darkTheme: {
        handler (newDarkTheme) {
          getDefaultBaseMaps().forEach(bm => {
            const baseMapLayer = this.baseMapLayers[bm.id]
            if (baseMapLayer != null) {
              if (bm.id === this.selectedBaseMapId) {
                this.map.removeLayer(this.baseMapLayers[bm.id])
              }
              if (bm.id !== getOfflineBaseMapId()) {
                this.baseMapLayers[bm.id] = this.createDefaultBaseMapLayer(bm, newDarkTheme)
              } else {
                this.baseMapLayers[bm.id] = this.createOfflineBaseMapLayer(bm, newDarkTheme)
              }
              if (bm.id === this.selectedBaseMapId) {
                this.map.addLayer(this.baseMapLayers[bm.id])
                this.setAttribution(bm.attribution)
                this.baseMapLayers[bm.id].bringToBack()
                this.mapBackground = newDarkTheme ? (bm.darkBackground || bm.background || '#333333') : (bm.background || '#ddd')
              }
            }
          })
        }
      },
      baseMaps: {
        handler (newBaseMaps) {
          const self = this
          const selectedBaseMapId = this.selectedBaseMapId
          const isDefaultBaseMap = self.defaultBaseMapIds.indexOf(selectedBaseMapId) !== -1

          let oldConfig
          if (!isNil(self.baseMapLayers[selectedBaseMapId]) && !isDefaultBaseMap) {
            oldConfig = self.baseMapLayers[selectedBaseMapId].getLayer()._configuration
          }
          // update the layer config stored for each base map
          newBaseMaps.filter(self.notReadOnlyBaseMapFilter).forEach(baseMap => {
            if (self.baseMapLayers[baseMap.id]) {
              self.baseMapLayers[baseMap.id].update(baseMap.layerConfiguration)
              self.baseMapLayers[baseMap.id].getLayer().error = baseMap.error
            }
          })
          const selectedBaseMap = newBaseMaps.find(baseMap => baseMap.id === selectedBaseMapId)
          if (!isDefaultBaseMap) {
            // if currently selected baseMapId is no longer available, be sure to remove it and close out the layer if possible
            if (isNil(selectedBaseMap)) {
              if (newBaseMaps.length - 1 < this.baseMapIndex) {
                this.baseMapIndex = newBaseMaps.length - 1
              }
              const layer = self.baseMapLayers[selectedBaseMapId]
              if (layer) {
                self.map.removeLayer(self.baseMapLayers[selectedBaseMapId])
              }
              delete self.baseMapLayers[selectedBaseMapId]
              self.selectedBaseMapId = newBaseMaps[self.baseMapIndex].id
            } else if (!isNil(oldConfig)) {
              const newConfig = selectedBaseMap.layerConfiguration
              const repaintFields = self.baseMapLayers[selectedBaseMapId].getLayer().getRepaintFields()
              const repaintRequired = !isEqual(pick(newConfig, repaintFields), pick(oldConfig, repaintFields))
              if (repaintRequired) {
                self.baseMapLayers[selectedBaseMapId].redraw()
              }
              this.mapBackground = selectedBaseMap.background || '#ddd'
            }
          }
        }
      },
      selectedBaseMapId: {
        async handler (newBaseMapId, oldBaseMapId) {
          const self = this
          self.$nextTick(async () => {
            this.baseMapIndex = self.baseMaps.findIndex(baseMap => baseMap.id === newBaseMapId)
            const newBaseMap = self.baseMaps[this.baseMapIndex]

            let success = true
            if (!newBaseMap.readonly && !isNil(newBaseMap.layerConfiguration) && isRemote(newBaseMap.layerConfiguration)) {
              success = await connectToBaseMap(newBaseMap, window.mapcache.editBaseMap, newBaseMap.layerConfiguration.timeoutMs)
            }

            // remove old map layer
            if (self.baseMapLayers[oldBaseMapId]) {
              self.map.removeLayer(self.baseMapLayers[oldBaseMapId])
            }

            if (success && !window.mapcache.isRasterMissing(newBaseMap.layerConfiguration)) {
              // check to see if base map has already been added
              if (isNil(self.baseMapLayers[newBaseMapId])) {
                await self.addBaseMap(newBaseMap, self.map)
              } else {
                // do not update offline base map id
                if (!newBaseMap.readonly) {
                  self.baseMapLayers[newBaseMapId].update(newBaseMap.layerConfiguration)
                }
                self.map.addLayer(self.baseMapLayers[newBaseMapId])
                this.setAttribution(newBaseMap.attribution)
                self.baseMapLayers[newBaseMapId].bringToBack()
              }
              self.mapBackground = newBaseMap.background || '#ddd'
            } else {
              self.map.addLayer(self.baseMapLayers[self.offlineBaseMapId])
              this.setAttribution(newBaseMap.attribution)
              self.baseMapLayers[self.offlineBaseMapId].bringToBack()
              self.selectedBaseMapId = self.offlineBaseMapId
            }
          })
        }
      },
      visible: {
        handler() {
          const self = this
          // just became visible, let's try to update the zoom to the normal map's zoom
          if (this.visible) {
            const centerAndZoom = this.getMapCenterAndZoom()
            if (!isNil(centerAndZoom)) {
              this.map.setView(centerAndZoom.center, centerAndZoom.zoom)
            }
          }
          this.$nextTick(() => {
            if (self.map) {
              self.map.invalidateSize()
            }
          })
        }
      },
      resizeListener: {
        handler(newValue, oldValue) {
          if (newValue !== oldValue) {
            const self = this
            self.$nextTick(() => {
              if (self.map) {
                self.map.invalidateSize()
              }
            })
          }
        }
      },
      previewLayer: {
        async handler(previewLayer) {
          if (!isNil(previewLayer)) {
            this.removePreviewLayer()
            this.setupPreviewLayer()
          } else {
            this.removePreviewLayer()
          }
        }
      },
      project: {
        async handler (updatedProject) {
          let self = this
          if (updatedProject.maxFeatures !== this.maxFeatures) {
            for (const baseMapId of keys(self.baseMapLayers)) {
              // if this is a vector layer, update it
              if (self.defaultBaseMapIds.indexOf(baseMapId) === -1 && self.baseMapLayers[baseMapId].getLayer().pane === 'vector') {
                // update max features
                await self.baseMapLayers[baseMapId].updateMaxFeatures(updatedProject.maxFeatures)
                // if visible, we need to toggle the layer
                if (baseMapId === self.selectedBaseMapId) {
                  self.baseMapLayers[baseMapId].redraw()
                }
              }
            }
          }
          this.maxFeatures = updatedProject.maxFeatures
        },
        deep: true
      }
    },
    mounted: function () {
      this.initializeMap()
      EventBus.$on(EventBus.EventTypes.PREVIEW_ZOOM_TO, (extent, minZoom = 0, maxZoom = 20) => {
        let boundingBox = [[extent[1], extent[0]], [extent[3], extent[2]]]
        let bounds = L.latLngBounds(boundingBox)
        bounds = bounds.pad(0.05)
        const target = this.map._getBoundsCenterZoom(bounds, {minZoom: minZoom, maxZoom: maxZoom})
        const currentMapCenter = this.map.getCenter()
        const distanceFactor = Math.max(Math.abs(target.center.lat - currentMapCenter.lat) / 180.0, Math.abs(target.center.lng - currentMapCenter.lng) / 360.0)
        this.map.flyTo(target.center, Math.max(minZoom, target.zoom), {minZoom: minZoom, maxZoom: maxZoom, animate: true, duration: Math.min(0.5, 3.0 * distanceFactor)})
      })
    },
    beforeDestroy: function () {
      EventBus.$off(EventBus.EventTypes.PREVIEW_ZOOM_TO)
      if (!isNil(this.previewMapLayer)) {
        this.previewMapLayer.remove()
        this.previewMapLayer = null
      }
    },
    beforeUpdate: function () {
      const self = this
      self.$nextTick(() => {
        if (self.map) {
          self.map.invalidateSize()
        }
      })
    }
  }
</script>

<style>
  @import '~leaflet/dist/leaflet.css';
  .preview-basemap-card {
    z-index: 2;
    top: 20px;
    min-width: 250px;
    max-width: 250px !important;
    position: absolute !important;
    right: 60px !important;
    max-height: 350px !important;
    border: 2px solid rgba(0,0,0,0.2) !important;
  }
  .dark {
    filter: brightness(0.7) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7) !important;
  }
</style>
