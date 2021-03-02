<template>
  <div v-show="visible" :style="{width: '100%', height: '100%', zIndex: 1, position: 'relative', display: 'flex'}">
    <div id="map-preview" :style="{width: '100%',  zIndex: 1, flex: 1, border: '8px solid #39FF14', backgroundColor: mapBackground}">
    </div>
    <v-card outlined v-if="showBaseMapSelection" class="preview-basemap-card">
      <v-card-title class="pb-2">
        Base Maps
      </v-card-title>
      <v-card-text class="pb-2">
        <v-card-subtitle class="pt-1 pb-1">
          Select a base map.
        </v-card-subtitle>
        <v-list dense class="pa-0" style="max-height: 200px; overflow-y: auto;">
          <v-list-item-group v-model="selectedBaseMapId" mandatory>
            <v-list-item v-for="item of baseMapItems" :key="item.id + '-basemap'" :value="item.id">
              <v-list-item-icon style="margin-right: 16px;">
                <v-btn style="width: 24px; height: 24px;" icon @click.stop="(e) => item.zoomTo(e, map)">
                  <v-icon small>mdi-map-outline</v-icon>
                </v-btn>
              </v-list-item-icon>
              <v-list-item-title>{{item.name}}</v-list-item-title>
              <base-map-troubleshooting v-if="item.baseMap.error" :base-map="item.baseMap"></base-map-troubleshooting>
              <v-progress-circular
                v-if="baseMapLayers[item.id] !== undefined && baseMapLayers[item.id].initializing"
                indeterminate
                color="primary"
              ></v-progress-circular>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
  import _ from 'lodash'
  import { mapState } from 'vuex'
  import * as vendor from '../../lib/vendor'
  import LeafletZoomIndicator from './LeafletZoomIndicator'
  import LayerFactory from '../../lib/source/layer/LayerFactory'
  import LeafletMapLayerFactory from '../../lib/map/mapLayers/LeafletMapLayerFactory'
  import LeafletActiveLayersTool from './LeafletActiveLayersTool'
  import LeafletBaseMapTool from './LeafletBaseMapTool'
  import offline from '../../assets/ne_50m_countries.geo'
  import BaseMapTroubleshooting from '../Settings/BaseMaps/BaseMapTroubleshooting'
  import ServiceConnectionUtils from '../../lib/ServiceConnectionUtils'
  import ActionUtilities from '../../lib/ActionUtilities'
  import LayerTypes from '../../lib/source/layer/LayerTypes'


  export default {
    components: {BaseMapTroubleshooting},
    props: {
      project: Object,
      previewLayer: Object,
      resizeListener: Number,
      visible: Boolean,
      getMapCenterAndZoom: Function
    },
    data () {
      return {
        previewMapLayer: null,
        observer: null,
        mapBackground: '#ddd',
        showBaseMapSelection: false,
        selectedBaseMapId: 0,
        baseMapLayers: {}
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
              zoomTo: _.debounce((e, map) => {
                e.stopPropagation()
                const extent = baseMapConfig.extent || [-180, -90, 180, 90]
                let boundingBox = [[extent[1], extent[0]], [extent[3], extent[2]]]
                let bounds = vendor.L.latLngBounds(boundingBox)
                bounds = bounds.pad(0.05)
                boundingBox = [[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]]
                map.fitBounds(boundingBox, {maxZoom: 20})
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
      setBounds (boundingBox, pad = true) {
        let bounds = boundingBox
        if (pad) {
          bounds = bounds.pad(0.05)
        }
        this.map.fitBounds([[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]], {maxZoom: 20})
      },
      addBaseMap (baseMap, map) {
        let self = this
        const baseMapId = baseMap.id
        self.baseMapLayers[baseMapId] = {
          layerConfiguration: _.cloneDeep(baseMap.layerConfiguration),
          initializing: true
        }
        if (baseMap.layerConfiguration.filePath === 'offline') {
          self.baseMapLayers[baseMapId].initializedLayer = baseMap.layerConfiguration
          self.baseMapLayers[baseMapId].mapLayer = vendor.L.geoJson(offline, {
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
          self.baseMapLayers[baseMapId].initializing = false
          map.addLayer(self.baseMapLayers[baseMapId].mapLayer)
          // updating initializing to false is not always updating the UI
          self.$forceUpdate()
        } else {
          let layer = LayerFactory.constructLayer(baseMap.layerConfiguration)
          layer._maxFeatures = self.project.maxFeatures
          layer.initialize().then(function () {
            // update style just in case during the initialization the layer was modified
            if (!_.isNil(self.baseMapLayers[baseMapId])) {
              if (layer.layerType === LayerTypes.GEOTIFF || layer.layerType === LayerTypes.GEOPACKAGE) {
                layer.updateStyle(self.baseMapLayers[baseMapId].layerConfiguration)
              }
              let mapLayer = LeafletMapLayerFactory.constructMapLayer(layer)
              self.baseMapLayers[baseMapId].initializedLayer = layer
              self.baseMapLayers[baseMapId].mapLayer = mapLayer
              self.baseMapLayers[baseMapId].initializing = false
              if (self.selectedBaseMapId === baseMapId) {
                map.addLayer(mapLayer)
              }
              // updating initializing to false is not always updating the UI
              self.$forceUpdate()
            }
          })
        }
      },
      async initializeMap () {
        const defaultCenter = [39.658748, -104.843165]
        const defaultZoom = 3

        this.map = vendor.L.map('map-preview', {
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
        await this.setupControls()
        this.map.setView(defaultCenter, defaultZoom)
        if (!_.isNil(this.previewLayer)) {
          this.setupPreviewLayer()
        }
      },
      async setupBaseMaps () {
        await this.addBaseMap(this.baseMaps[0], this.map)
      },
      async setupControls () {
        let self = this
        this.basemapControl = new LeafletBaseMapTool({}, function () {
          self.showBaseMapSelection = !self.showBaseMapSelection
        })
        this.map.addControl(this.basemapControl)
        await this.setupBaseMaps()
        this.map.zoomControl.setPosition('topright')
        this.displayZoomControl = new LeafletZoomIndicator()
        this.map.addControl(this.displayZoomControl)
        this.activeLayersControl = new LeafletActiveLayersTool({}, function () {
          self.setBounds(vendor.L.latLngBounds([[self.previewLayer.extent[1], self.previewLayer.extent[0]], [self.previewLayer.extent[3], self.previewLayer.extent[2]]]))
        }, null, null)
        vendor.L.control.scale().addTo(this.map)
        this.map.addControl(this.activeLayersControl)
      },
      async setupPreviewLayer () {
        const layer = LayerFactory.constructLayer(this.previewLayer)
        await layer.initialize()
        this.previewMapLayer = LeafletMapLayerFactory.constructMapLayer(layer, 'markerPane', true)
        this.previewMapLayer.addTo(this.map)
        this.activeLayersControl.enable()
      },
      removePreviewLayer () {
        if (!_.isNil(this.previewMapLayer)) {
          this.previewMapLayer.remove()
          this.previewMapLayer = null
        }
      }
    },
    watch: {
      baseMaps: {
        async handler (newBaseMaps) {
          const self = this
          const selectedBaseMapId = this.selectedBaseMapId

          const oldBaseMapConfig = self.baseMapLayers[selectedBaseMapId].layerConfiguration
          // update the layer config stored for each base map
          newBaseMaps.forEach(baseMap => {
            if (self.baseMapLayers[baseMap.id]) {
              self.baseMapLayers[baseMap.id].layerConfiguration = baseMap.layerConfiguration
              if (self.baseMapLayers[baseMap.id].initializedLayer) {
                self.baseMapLayers[baseMap.id].initializedLayer.error = baseMap.error
              }
            }
          })
          const selectedBaseMap = newBaseMaps.find(baseMap => baseMap.id === selectedBaseMapId)
          // if currently selected baseMapId is no longer available, be sure to remove it and close out the layer if possible
          if (_.isNil(selectedBaseMap)) {
            if (newBaseMaps.length - 1 < this.baseMapIndex) {
              this.baseMapIndex = newBaseMaps.length - 1
            }
            if (self.baseMapLayers[selectedBaseMapId] && self.baseMapLayers[selectedBaseMapId].mapLayer) {
              self.map.removeLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
            }
            const initializedLayer = self.baseMapLayers[selectedBaseMapId].initializedLayer
            if (initializedLayer && Object.prototype.hasOwnProperty.call(initializedLayer, 'close')) {
              initializedLayer.close()
            }
            delete self.baseMapLayers[selectedBaseMapId]
            self.selectedBaseMapId = newBaseMaps[self.baseMapIndex].id
          } else {
            if (!_.isNil(selectedBaseMap) && !_.isNil(selectedBaseMap.layerConfiguration) && !_.isNil(self.baseMapLayers[selectedBaseMapId]) && !_.isNil(self.baseMapLayers[selectedBaseMapId].initializedLayer)) {
              if (selectedBaseMap.layerConfiguration.layerType === LayerTypes.GEOTIFF || selectedBaseMap.layerConfiguration.layerType === LayerTypes.MBTILES) {
                self.map.removeLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
                self.baseMapLayers[selectedBaseMapId].initializedLayer.updateStyle(selectedBaseMap.layerConfiguration)
                self.baseMapLayers[selectedBaseMapId].mapLayer = LeafletMapLayerFactory.constructMapLayer(self.baseMapLayers[selectedBaseMapId].initializedLayer)
                self.map.addLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
              } else if (!_.isEqual(selectedBaseMap.layerConfiguration.styleKey, oldBaseMapConfig.styleKey) && selectedBaseMap.layerConfiguration.pane === 'vector') {
                self.map.removeLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
                self.baseMapLayers[selectedBaseMapId].initializedLayer.updateStyle(this.project.maxFeatures)
                self.baseMapLayers[selectedBaseMapId].mapLayer = LeafletMapLayerFactory.constructMapLayer(self.baseMapLayers[selectedBaseMapId].initializedLayer)
                self.map.addLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
              } else {
                try {
                  if (self.baseMapLayers[selectedBaseMapId].mapLayer && self.baseMapLayers[selectedBaseMapId].mapLayer.hasError() && _.isNil(selectedBaseMap.error)) {
                    self.map.removeLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
                    self.baseMapLayers[selectedBaseMapId].mapLayer = LeafletMapLayerFactory.constructMapLayer(self.baseMapLayers[selectedBaseMapId].initializedLayer)
                    self.map.addLayer(self.baseMapLayers[selectedBaseMapId].mapLayer)
                  }
                  // eslint-disable-next-line no-empty
                } catch (e) {}
              }
              try {
                self.baseMapLayers[selectedBaseMapId].mapLayer.setOpacity(selectedBaseMap.layerConfiguration.opacity)
                // eslint-disable-next-line no-empty
              } catch (e) {}
              try {
                self.baseMapLayers[selectedBaseMapId].mapLayer.setError(selectedBaseMap.error)
                // eslint-disable-next-line no-empty
              } catch (e) {}
              try {
                if (selectedBaseMap.layerConfiguration.layerType === LayerTypes.WMS || selectedBaseMap.layerConfiguration.layerType === LayerTypes.XYZ_SERVER) {
                  self.baseMapLayers[selectedBaseMapId].initializedLayer.updateNetworkSettings(selectedBaseMap.layerConfiguration)
                  self.baseMapLayers[selectedBaseMapId].mapLayer.updateNetworkSettings(selectedBaseMap.layerConfiguration)
                }
                // eslint-disable-next-line no-empty
              } catch (e) {}
              this.mapBackground = selectedBaseMap.background || '#ddd'
            }
          }
        }
      },
      selectedBaseMapId: {
        async handler (newBaseMapId, oldBaseMapId) {
          const self = this
          const oldBaseMapIndex = oldBaseMapId
          self.$nextTick(async () => {
            this.baseMapIndex = self.baseMaps.findIndex(baseMap => baseMap.id === newBaseMapId)
            const newBaseMap = self.baseMaps[this.baseMapIndex]

            let success = true
            if (!newBaseMap.readonly && !_.isNil(newBaseMap.layerConfiguration) && (newBaseMap.layerConfiguration.layerType === LayerTypes.WMS || newBaseMap.layerConfiguration.layerType === LayerTypes.XYZ_SERVER)) {
              success = await ServiceConnectionUtils.connectToBaseMap(newBaseMap, ActionUtilities.editBaseMap)
            }

            if (success) {
              if (self.baseMapLayers[oldBaseMapId] && self.baseMapLayers[oldBaseMapId].mapLayer) {
                self.map.removeLayer(self.baseMapLayers[oldBaseMapId].mapLayer)
              }

              // check to see if base map has already been initialized
              if (_.isNil(self.baseMapLayers[newBaseMapId])) {
                await self.addBaseMap(newBaseMap, self.map)
              } else {
                try {
                  self.baseMapLayers[newBaseMapId].mapLayer.setError(newBaseMap.error)
                  // eslint-disable-next-line no-empty
                } catch (e) {}
                try {
                  self.baseMapLayers[newBaseMapId].mapLayer.setOpacity(newBaseMap.layerConfiguration.opacity)
                  // eslint-disable-next-line no-empty
                } catch (e) {}
                try {
                  if (newBaseMap.layerConfiguration.layerType === LayerTypes.WMS || newBaseMap.layerConfiguration.layerType === LayerTypes.XYZ_SERVER) {
                    self.baseMapLayers[newBaseMapId].initializedLayer.updateNetworkSettings(newBaseMap.layerConfiguration)
                    self.baseMapLayers[newBaseMapId].mapLayer.updateNetworkSettings(newBaseMap.layerConfiguration)
                  }
                  // eslint-disable-next-line no-empty
                } catch (e) {}
                if (newBaseMap.layerConfiguration.layerType === LayerTypes.GEOTIFF || newBaseMap.layerConfiguration.layerType === LayerTypes.MBTILES && !_.isNil(self.baseMapLayers[newBaseMapId].initializedLayer)) {
                  self.baseMapLayers[newBaseMapId].initializedLayer.updateStyle(newBaseMap.layerConfiguration)
                  self.baseMapLayers[newBaseMapId].mapLayer = LeafletMapLayerFactory.constructMapLayer(self.baseMapLayers[newBaseMapId].initializedLayer)
                }
                try {
                  if (self.baseMapLayers[newBaseMapId].mapLayer.hasError()) {
                    self.baseMapLayers[newBaseMapId].initializedLayer.error = newBaseMap.error
                    self.baseMapLayers[newBaseMapId].mapLayer = LeafletMapLayerFactory.constructMapLayer(self.baseMapLayers[newBaseMapId].initializedLayer)
                  }
                  // eslint-disable-next-line no-empty
                } catch (e) {}
                self.map.addLayer(self.baseMapLayers[newBaseMapId].mapLayer)
              }
              this.mapBackground = newBaseMap.background || '#ddd'
            } else {
              this.selectedBaseMapId = oldBaseMapIndex
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
            if (!_.isNil(centerAndZoom)) {
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
          if (!_.isNil(previewLayer)) {
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
            for (const baseMapId of _.keys(self.baseMapLayers)) {
              if (!_.isNil(self.baseMapLayers[baseMapId].initializedLayer) && self.baseMapLayers[baseMapId].initializedLayer.pane === 'vector') {
                if (self.selectedBaseMapId === baseMapId) {
                  self.map.removeLayer(self.baseMapLayers[self.selectedBaseMapId].mapLayer)
                }
                await self.baseMapLayers[self.selectedBaseMapId].initializedLayer.updateStyle(updatedProject.maxFeatures)
                self.baseMapLayers[self.selectedBaseMapId].mapLayer = LeafletMapLayerFactory.constructMapLayer(self.baseMapLayers[self.selectedBaseMapId].initializedLayer)
                if (self.selectedBaseMapId === baseMapId) {
                  self.map.addLayer(self.baseMapLayers[self.selectedBaseMapId].mapLayer)
                }
              }
            }
          }
          this.maxFeatures = updatedProject.maxFeatures
        },
        deep: true
      }
    },
    mounted: async function () {
      await this.initializeMap()
    },
    beforeDestroy: function () {
      if (!_.isNil(this.previewMapLayer)) {
        this.previewMapLayer.remove()
        this.previewMapLayer = null
      }
      _.keys(self.baseMapLayers).forEach(key => {
        let layer = self.baseMapLayers[key].initializedLayer
        if (!_.isNil(layer) && Object.prototype.hasOwnProperty.call(layer, 'close')) {
          layer.close()
        }
      })
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
