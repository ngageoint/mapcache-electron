<template>
  <div id="map" style="width: 100%; height: 100%;"></div>
</template>

<script>
  import * as vendor from '../../../lib/vendor'
  import ZoomToExtent from './ZoomToExtent'
  import DrawBounds from './DrawBounds'
  import LayerFactory from '../../../lib/source/layer/LayerFactory'
  import LeafletZoomIndicator from '../../../lib/map/LeafletZoomIndicator'

  let mapLayers = {}

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
          let oldLayerIds = Object.keys(mapLayers)
          let removed = oldLayerIds.filter((i) => currentLayerIds.indexOf(i) < 0)
          let added = currentLayerIds.filter((i) => oldLayerIds.indexOf(i) < 0)
          let same = oldLayerIds.filter((i) => currentLayerIds.indexOf(i) >= 0)

          for (const layerId of removed) {
            let mapLayer = mapLayers[layerId]
            mapLayer.remove()
            delete mapLayers[layerId]
          }

          for (const layerId of added) {
            let layerConfig = value[layerId]
            let layer = LayerFactory.constructLayer(layerConfig)
            console.log('initialize the layer')
            await layer.initialize()

            let mapLayer = layer.mapLayer
            mapLayer.addTo(this.map)
            mapLayers[mapLayer.id] = mapLayer
          }

          for (const layerId of same) {
            // check if it got hidden
            let layerConfig = value[layerId]
            if (layerConfig.shown && !mapLayers[layerId]) {
              let layer = LayerFactory.constructLayer(layerConfig)
              await layer.initialize()

              let mapLayer = layer.mapLayer
              mapLayer.addTo(this.map)
              mapLayers[mapLayer.id] = mapLayer
            } else if (!layerConfig.shown && mapLayers[layerId]) {
              let mapLayer = mapLayers[layerId]
              mapLayer.remove()
              delete mapLayers[layerId]
            } else if (layerConfig.shown) {
              let mapLayer = mapLayers[layerId]
              mapLayer.remove()
              delete mapLayers[layerId]
              let layer = LayerFactory.constructLayer(layerConfig)
              await layer.initialize()

              mapLayer = layer.mapLayer
              mapLayer.addTo(this.map)
              mapLayers[mapLayer.id] = mapLayer
            }
          }
        },
        deep: true
      }
    },
    mounted: async function () {
      console.log('Leaflet map mounted')

      this.map = vendor.L.map('map', {editable: true})
      const defaultCenter = [39.658748, -104.843165]
      const defaultZoom = 4
      const osmbasemap = vendor.L.tileLayer('https://osm-{s}.geointservices.io/tiles/default/{z}/{x}/{y}.png', {
        subdomains: ['1', '2', '3', '4']
      })
      // const basemap = vendor.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      //   attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
      // })

      this.map.setView(defaultCenter, defaultZoom)
      osmbasemap.addTo(this.map)

      this.map.addControl(new LeafletZoomIndicator())

      for (const layerId in this.layerConfigs) {
        let layerConfig = this.layerConfigs[layerId]
        if (!layerConfig.shown) continue

        let layer = LayerFactory.constructLayer(layerConfig)
        console.log('initialize the layer', layer)
        await layer.initialize()

        let mapLayer = layer.mapLayer
        mapLayer.addTo(this.map)
        mapLayers[mapLayer.id] = mapLayer
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
