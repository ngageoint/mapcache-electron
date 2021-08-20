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
import BaseMapTroubleshooting from '../BaseMaps/BaseMapTroubleshooting'
import { mdiMapOutline } from '@mdi/js'
import { L } from '../../lib/leaflet/vendor'
import { constructMapLayer } from '../../lib/leaflet/map/layers/LeafletMapLayerFactory'
import { constructLayer } from '../../lib/layer/LayerFactory'
import {getOfflineBaseMapId} from '../../lib/util/BaseMapUtilities'
import { isRemote } from '../../lib/layer/LayerTypes'
import { connectToBaseMap } from '../../lib/network/ServiceConnectionUtils'
import GeoTIFFTroubleshooting from '../Common/GeoTIFFTroubleshooting'
import DrawBounds from '../../lib/leaflet/map/controls/DrawBounds'
import GridBounds from '../../lib/leaflet/map/controls/GridBounds'
import EventBus from '../../lib/vue/EventBus'
import {zoomToBaseMap, zoomToSource} from '../../lib/util/ZoomUtilities'

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
      getMapCenterAndZoom: Function
    },
    data () {
      return {
        mdiMapOutline: mdiMapOutline,
        previewMapLayer: null,
        observer: null,
        mapBackground: '#ddd',
        showBaseMapSelection: false,
        selectedBaseMapId: '0',
        baseMapLayers: {},
        offlineBaseMapId: getOfflineBaseMapId(),
        notReadOnlyBaseMapFilter: baseMap => !baseMap.readonly,
      }
    },
    computed: {
      ...mapState({
        baseMapItems: state => {
          return (state.BaseMaps.baseMaps || []).map(baseMapConfig => {
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
          return state.BaseMaps.baseMaps || []
        }
      })
    },
    methods: {
      addBaseMap (baseMap, map) {
        let self = this
        const baseMapId = baseMap.id
        if (baseMap.layerConfiguration.filePath === 'offline') {
          self.baseMapLayers[baseMapId] = L.geoJson(window.mapcache.getOfflineMap(), {
            pane: 'baseMapPane',
            style: function() {
              return {
                color: '#000000',
                weight: 0.5,
                fill: true,
                fillColor: '#F9F9F6',
                fillOpacity: 1
              }
            }
          })
          if (this.selectedBaseMapId === baseMapId) {
            map.addLayer(self.baseMapLayers[baseMapId])
            self.baseMapLayers[baseMapId].bringToBack()
          }
        } else {
          let layer = constructLayer(baseMap.layerConfiguration)
          self.baseMapLayers[baseMapId] = constructMapLayer({layer: layer, maxFeatures: self.project.maxFeatures})
          if (self.selectedBaseMapId === baseMapId) {
            map.addLayer(self.baseMapLayers[baseMapId])
            self.baseMapLayers[baseMapId].bringToBack()
          }
        }
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
        this.map.createPane('baseMapPane')
        this.map.getPane('baseMapPane').style.zIndex = 200
        this.map.createPane('gridSelectionPane')
        this.map.getPane('gridSelectionPane').style.zIndex = 625
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
        L.control.scale().addTo(this.map)
        this.map.addControl(this.activeLayersControl)
      },
      setupPreviewLayer () {
        const layer = constructLayer(this.previewLayer)
        this.previewMapLayer = constructMapLayer({layer: layer, mapPane: 'overlayPane', isPreview: true, maxFeatures: this.project.maxFeatures})
        this.previewMapLayer.addTo(this.map)
        this.activeLayersControl.enable()
      },
      removePreviewLayer () {
        if (!isNil(this.previewMapLayer)) {
          this.previewMapLayer.remove()
          this.previewMapLayer = null
        }
      }
    },
    watch: {
      baseMaps: {
        handler (newBaseMaps) {
          const self = this
          const selectedBaseMapId = this.selectedBaseMapId

          let oldConfig
          if (!isNil(self.baseMapLayers[selectedBaseMapId]) && selectedBaseMapId !== self.offlineBaseMapId) {
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
          if (selectedBaseMapId !== self.offlineBaseMapId) {
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
            if (!isNil(newBaseMap.layerConfiguration) && isRemote(newBaseMap.layerConfiguration)) {
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
                if (newBaseMapId !== self.offlineBaseMapId) {
                  self.baseMapLayers[newBaseMapId].update(newBaseMap.layerConfiguration)
                }
                self.map.addLayer(self.baseMapLayers[newBaseMapId])
                self.baseMapLayers[newBaseMapId].bringToBack()
              }
              self.mapBackground = newBaseMap.background || '#ddd'
            } else {
              self.map.addLayer(self.baseMapLayers[self.offlineBaseMapId])
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
              if (baseMapId !== self.offlineBaseMapId && self.baseMapLayers[baseMapId].getLayer().pane === 'vector') {
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
        const target = this.map._getBoundsCenterZoom(bounds, {minZoom: minZoom, maxZoom: maxZoom});
        this.map.setView(target.center, Math.max(minZoom, target.zoom), {minZoom: minZoom, maxZoom: maxZoom});
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
</style>
