<template>
  <div id="map" style="width: 100%; height: 100%;"></div>
</template>

<script>
  import { mapActions } from 'vuex'
  import * as vendor from '../../../lib/vendor'
  import LayerFactory from '../../../lib/source/layer/LayerFactory'
  import LeafletZoomIndicator from '../../../lib/map/LeafletZoomIndicator'

  let map
  let mapLayers = {}

  export default {
    props: ['layerConfigs', 'activeGeopackage', 'projectId'],
    methods: {
      ...mapActions({
        setGeoPackageAOI: 'Projects/setGeoPackageAOI'
      }),
      activateDraw () {
        console.log('activate draw')
        // map.editTools.startRectangle()
      },
      activateGeoPackageAOI () {
        let r
        if (!this.activeGeopackage.aoi) {
          r = map.editTools.startRectangle()
        } else {
          let bounds = vendor.L.latLngBounds(this.activeGeopackage.aoi)
          r = vendor.L.rectangle(bounds)
          r.addTo(map)
          r.enableEdit()
        }
        r.on('editable:vertex:dragend', () => {
          let sw = r.getBounds().getSouthWest()
          let ne = r.getBounds().getNorthEast()
          let bounds = [[sw.lat, sw.lng], [ne.lat, ne.lng]]
          this.setGeoPackageAOI({projectId: this.projectId, geopackageId: this.activeGeopackage.id, aoi: bounds})
        })
      },
      zoomToExtent (extent) {
        console.log({extent})
        map.fitBounds([
          [extent[1], extent[0]],
          [extent[3], extent[2]]
        ])
      }
    },
    watch: {
      activeGeopackage: {
        handler (value, oldValue) {
          this.activateGeoPackageAOI()
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
            await layer.initialize()

            let mapLayer = layer.mapLayer
            mapLayer.addTo(map)
            mapLayers[mapLayer.id] = mapLayer
          }

          for (const layerId of same) {
            // check if it got hidden
            let layerConfig = value[layerId]
            if (layerConfig.shown && !mapLayers[layerId]) {
              let layer = LayerFactory.constructLayer(layerConfig)
              await layer.initialize()

              let mapLayer = layer.mapLayer
              mapLayer.addTo(map)
              mapLayers[mapLayer.id] = mapLayer
            } else if (!layerConfig.shown && mapLayers[layerId]) {
              let mapLayer = mapLayers[layerId]
              mapLayer.remove()
              delete mapLayers[layerId]
            }
          }
        },
        deep: true
      }
    },
    mounted: async function () {
      map = vendor.L.map('map', {editable: true})
      const defaultCenter = [39.658748, -104.843165]
      const defaultZoom = 4
      const osmbasemap = vendor.L.tileLayer('https://osm-{s}.geointservices.io/tiles/default/{z}/{x}/{y}.png', {
        subdomains: ['1', '2', '3', '4']
      })
      // const basemap = vendor.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      //   attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
      // })

      map.setView(defaultCenter, defaultZoom)
      osmbasemap.addTo(map)

      map.addControl(new LeafletZoomIndicator())

      for (const layerId in this.layerConfigs) {
        let layerConfig = this.layerConfigs[layerId]
        if (!layerConfig.shown) continue

        let layer = LayerFactory.constructLayer(layerConfig)
        await layer.initialize()

        let mapLayer = layer.mapLayer
        mapLayer.addTo(map)
        mapLayers[mapLayer.id] = mapLayer
      }
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
