<template>
  <div id="map" style="width: 100%; height: 100%;"></div>
</template>

<script>
  import * as vendor from '../../../lib/vendor'
  import ZoomToExtent from './ZoomToExtent'
  import DrawBounds from './DrawBounds'
  import LayerFactory from '../../../lib/source/layer/LayerFactory'
  import LeafletZoomIndicator from '../../../lib/map/LeafletZoomIndicator'
  import _ from 'lodash'

  let shownMapLayers = {}
  let shownLayerConfigs = {}

  export default {
    mixins: [
      ZoomToExtent,
      DrawBounds
    ],
    props: {
      layerConfigs: Object,
      activeGeopackage: Object,
      projectId: String
    },
    methods: {
      activateGeoPackageAOI () {

      }
    },
    watch: {
      drawBounds: {
        handler (value, oldValue) {
          this.setupDrawing(value)
        },
        deep: true
      },
      layerConfigs: {
        async handler (value, oldValue) {
          let currentLayerIds = Object.keys(value)
          let existingLayerIds = Object.keys(shownMapLayers)
          // layers that have been removed from the list or are no longer being shown
          let removed = existingLayerIds.filter((i) => currentLayerIds.indexOf(i) < 0 || !value[i].shown)
          // layers that have been added and are being shown
          let added = currentLayerIds.filter((i) => existingLayerIds.indexOf(i) < 0 && value[i].shown)
          // layers that still exist may have changed. check if the rgb has changed...
          let same = existingLayerIds.filter((i) => currentLayerIds.indexOf(i) >= 0 && value[i].shown)

          for (const layerId of removed) {
            let mapLayer = shownMapLayers[layerId]
            mapLayer.remove()
            delete shownMapLayers[layerId]
            delete shownLayerConfigs[layerId]
          }

          for (const layerId of added) {
            let layerConfig = value[layerId]
            let layer = LayerFactory.constructLayer(layerConfig)
            await layer.initialize()
            let mapLayer = layer.mapLayer
            mapLayer.addTo(this.map)
            shownMapLayers[mapLayer.id] = mapLayer
            shownLayerConfigs[mapLayer.id] = _.cloneDeep(layerConfig)
          }

          for (const layerId of same) {
            let layerConfig = value[layerId]
            let oldLayerConfig = shownLayerConfigs[layerId]

            if (!_.isEqual(layerConfig, oldLayerConfig)) {
              let existingMapLayer = shownMapLayers[layerId]
              existingMapLayer.remove()
              delete shownMapLayers[layerId]
              delete shownLayerConfigs[layerId]
              let layer = LayerFactory.constructLayer(layerConfig)
              await layer.initialize()
              let updateMapLayer = layer.mapLayer
              updateMapLayer.addTo(this.map)
              shownMapLayers[updateMapLayer.id] = updateMapLayer
              shownLayerConfigs[updateMapLayer.id] = _.cloneDeep(layerConfig)
            }
          }
        },
        deep: true
      }
    },
    mounted: async function () {
      this.map = vendor.L.map('map', {editable: true})
      const defaultCenter = [39.658748, -104.843165]
      const defaultZoom = 4
      const osmbasemap = vendor.L.tileLayer('https://osm-{s}.geointservices.io/tiles/default/{z}/{x}/{y}.png', {
        subdomains: ['1', '2', '3', '4']
      })
      this.map.setView(defaultCenter, defaultZoom)
      osmbasemap.addTo(this.map)

      this.map.addControl(new LeafletZoomIndicator())

      for (const layerId in this.layerConfigs) {
        let layerConfig = this.layerConfigs[layerId]
        if (!layerConfig.shown) continue

        let layer = LayerFactory.constructLayer(layerConfig)
        await layer.initialize()
        let mapLayer = layer.mapLayer
        mapLayer.addTo(this.map)
        shownMapLayers[mapLayer.id] = mapLayer
        shownLayerConfigs[mapLayer.id] = _.cloneDeep(layerConfig)
      }

      this.setupDrawing(this.drawBounds)
      if (this.activeGeopackage) {
        this.activateGeoPackageAOI()
      }
    }
  }
</script>

<style>

  @import '~leaflet/dist/leaflet.css';

  .leaflet-control-zoom-indicator {
    font-weight: bold;
  }

</style>
