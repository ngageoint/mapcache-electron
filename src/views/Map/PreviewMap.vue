<template>
  <div v-show="visible" :style="{width: '100%', height: '100%', zIndex: 1, position: 'relative', display: 'flex'}">
    <div id="map-preview" :style="{width: '100%',  zIndex: 1, flex: 1, border: '8px solid #39FF14', backgroundColor: mapBackground}">
    </div>
  </div>
</template>

<script>
  import _ from 'lodash'
  import * as vendor from '../../lib/vendor'
  import LeafletZoomIndicator from './LeafletZoomIndicator'
  import LayerFactory from '../../lib/source/layer/LayerFactory'
  import LeafletMapLayerFactory from '../../lib/map/mapLayers/LeafletMapLayerFactory'
  import countries from './countries-land-10km.geo.json'
  import LeafletActiveLayersTool from './LeafletActiveLayersTool'

  export default {
    props: {
      projectId: String,
      previewLayer: Object,
      resizeListener: Number,
      visible: Boolean,
      getMapCenterAndZoom: Function
    },
    data () {
      return {
        previewMapLayer: null,
        observer: null,
        mapBackground: '#ddd'
      }
    },
    methods: {
      setBounds (boundingBox, pad = true) {
        let bounds = boundingBox
        if (pad) {
          bounds = bounds.pad(0.05)
        }
        this.map.fitBounds([[bounds.getSouthWest().lat, bounds.getSouthWest().lng], [bounds.getNorthEast().lat, bounds.getNorthEast().lng]])
      },
      initializeMap () {
        const defaultCenter = [39.658748, -104.843165]
        const defaultZoom = 3
        const defaultBaseMap = vendor.L.tileLayer('https://osm-{s}.gs.mil/tiles/default/{z}/{x}/{y}.png', {subdomains: ['1', '2', '3', '4'], maxZoom: 20})
        const streetsBaseMap = vendor.L.tileLayer('https://osm-{s}.gs.mil/tiles/bright/{z}/{x}/{y}.png', {subdomains: ['1', '2', '3', '4'], maxZoom: 20})
        const satelliteBaseMap = vendor.L.tileLayer('https://osm-{s}.gs.mil/tiles/humanitarian/{z}/{x}/{y}.png', {subdomains: ['1', '2', '3', '4'], maxZoom: 20})
        const offline = vendor.L.geoJSON(countries, {
          pane: 'tilePane',
          style: function() {
            return {
              color: '#BBBBBB',
              weight: 0.5,
              fill: true,
              fillColor: '#F9F9F6',
              fillOpacity: 1,
            };
          },
        })
        const baseMaps = {
          'Default': defaultBaseMap,
          'Bright': streetsBaseMap,
          'Humanitarian': satelliteBaseMap,
          'Offline': offline
        }
        this.map = vendor.L.map('map-preview', {
          editable: true,
          attributionControl: false,
          center: defaultCenter,
          zoom: defaultZoom,
          minZoom: 2,
          layers: [defaultBaseMap]
        })
        this.map.on('baselayerchange', (e) => {
          let name = 'default'
          if (e.name) {
            name = e.name.toLowerCase()
          }
          switch (name) {
            case 'offline':
              this.mapBackground = '#c0d9e4'
              break
            default:
              this.mapBackground = '#ddd'
              break
          }
        })
        this.map.setView(defaultCenter, defaultZoom)
        this.baseMapsControl = vendor.L.control.layers(baseMaps)
        this.baseMapsControl.addTo(this.map)
        this.setupControls()
        this.map.setView(defaultCenter, defaultZoom)
        if (!_.isNil(this.previewLayer)) {
          this.setupPreviewLayer()
        }
      },
      setupControls () {
        let self = this
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
        this.previewMapLayer = LeafletMapLayerFactory.constructMapLayer(layer)
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
            this.$nextTick(() => {
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
      }
    },
    mounted: async function () {
      this.initializeMap()
    },
    beforeDestroy: function () {
      if (!_.isNil(this.previewMapLayer)) {
        this.previewMapLayer.remove()
        this.previewMapLayer = null
      }
    },
    beforeUpdate: function () {
      const self = this
      this.$nextTick(() => {
        if (self.map) {
          self.map.invalidateSize()
        }
      })
    }
  }
</script>

<style>
  @import '~leaflet/dist/leaflet.css';
  .leaflet-control-zoom-to-active {
    background: url('../../assets/zoom-to-active.svg') no-repeat;
  }
  .leaflet-control-clear-active {
    background: url('../../assets/clear-active-layers.svg') no-repeat;
  }

  .leaflet-control-zoom-indicator {
    font-weight: bold;
  }
  .leaflet-control-draw-point {
    background: url('../../assets/point.svg') no-repeat;
  }
  .leaflet-control-draw-polygon {
    background: url('../../assets/polygon.svg') no-repeat;
  }
  .leaflet-control-draw-rectangle {
    background: url('../../assets/rectangle.svg') no-repeat;
  }
  .leaflet-control-draw-linestring {
    background: url('../../assets/linestring.svg') no-repeat;
  }
  .leaflet-control-layer-ordering {
    background: url('../../assets/order-layers.svg') no-repeat;
  }
  .leaflet-control-draw-cancel {
    background: url('../../assets/close.svg') no-repeat;
  }
  .leaflet-control-edit-save {
    background: url('../../assets/save.svg') no-repeat;
  }
  .leaflet-control-disabled {
    color: currentColor;
    cursor: not-allowed;
    opacity: 0.5;
    text-decoration: none;
  }
  .layer__request-btn {
    position: relative;
    width: 10vh;
    height: 40px;
    font-size: 14px;
    font-weight: 400;
    font-family: Roboto, sans-serif;
    color: #FFFFFF;
    outline: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    letter-spacing: 0;
    -webkit-transition: letter-spacing 0.3s;
    transition: letter-spacing 0.3s;
  }
  .layer__request-btn__confirm {
    background: #FF5555;
    margin-right: 1vh;
  }
  .layer__request-btn__text-1 {
    -webkit-transition: opacity 0.48s;
    transition: opacity 0.48s;
  }
  .layer.req-active1 .layer__request-btn__text-1 {
    opacity: 0;
  }
  .layer.req-active2 .layer__request-btn__text-1 {
    display: none;
  }
  .layer__request-btn:hover {
    letter-spacing: 5px;
  }
  .layer-style-container {
    display: flex;
    flex-direction: row;
  }
  .layer-style-type {
    flex: 1;
  }
  .leaflet-control a {
    color: black !important;
  }
  .leaflet-touch .leaflet-control-layers-toggle {
    width: 30px;
    height: 30px;
  }
  #tooltip {
    display: none;
    position: absolute;
    left: 10px;
    background: #666;
    color: white;
    opacity: 0.90;
    padding: 8px;
    font-family: Roboto, sans-serif;
    font-size: 12px;
    height: 34px;
    line-height: 18px;
    z-index: 2000;
    border: black 1px;
    border-radius: 4px;
  }
</style>
