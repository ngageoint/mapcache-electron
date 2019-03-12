<template>
  <div id="map" style="width: 100%; height: 100%;"></div>
</template>

<script>
  import { mapActions, mapState } from 'vuex'
  import * as vendor from '../../../lib/vendor'
  import LayerFactory from '../../../lib/source/layer/LayerFactory'
  import LeafletZoomIndicator from '../../../lib/map/LeafletZoomIndicator'

  let map
  let mapLayers = {}

  export default {
    props: {
      layerConfigs: Object,
      activeGeopackage: Object,
      projectId: String
    },
    computed: {
      ...mapState({
        extents (state) {
          return state.UIState[this.projectId].extents
        },
        drawBounds (state) {
          console.log('state', state.UIState[this.projectId].drawBounds)
          return state.UIState[this.projectId].drawBounds
        }
      })
    },
    methods: {
      ...mapActions({
        setDrawnBounds: 'UIState/setDrawnBounds',
        setProjectExtents: 'UIState/setProjectExtents'
      }),
      activateGeoPackageAOI () {

      },
      zoomToExtent (extent) {
        console.log({extent})
        map.fitBounds([
          [extent[1], extent[0]],
          [extent[3], extent[2]]
        ])
      },
      setupDrawing (drawBounds) {
        console.log('draw bounds handler')
        if (this.r) {
          map.removeLayer(this.r)
        }

        console.log('drawBounds', drawBounds)
        // find the newly activated drawing
        let gpDrawBounds = drawBounds[this.activeGeopackage.id]
        for (const key in gpDrawBounds) {
          console.log('key', key)
          console.log('value', gpDrawBounds[key])
          // if the bounds drawing for the whole geopackage was activated, do this
          if (gpDrawBounds[key] === true) {
            let aoi
            if (key === 'geopackage') {
              aoi = this.activeGeopackage.aoi
            } else if (this.activeGeopackage.imageryLayers[key]) {
              aoi = this.activeGeopackage.imageryLayers[key].aoi
            } else if (this.activeGeopackage.featureLayers[key]) {
              aoi = this.activeGeopackage.featureLayers[key].aoi
            }
            console.log('aoi', aoi)
            if (!aoi || !aoi.length) {
              this.r = map.editTools.startRectangle()
            } else {
              let bounds = vendor.L.latLngBounds(aoi)
              this.r = vendor.L.rectangle(bounds)
              this.r.addTo(map)
              this.r.enableEdit()
            }
            this.r.layerId = key
            this.r.on('editable:vertex:dragend', () => {
              let sw = this.r.getBounds().getSouthWest()
              let ne = this.r.getBounds().getNorthEast()
              let bounds = [[sw.lat, sw.lng], [ne.lat, ne.lng]]
              this.setDrawnBounds({projectId: this.projectId, bounds, geopackageId: this.activeGeopackage.id, layerId: this.r.layerId})
              // this.setGeoPackageAOI({projectId: this.projectId, geopackageId: this.activeGeopackage.id, aoi: bounds})
            })
          }
        }
      }
    },
    watch: {
      drawBounds: {
        handler (value, oldValue) {
          this.setupDrawing(value)
        },
        deep: true
      },
      extents: {
        handler (value, oldValue) {
          console.log('uistate changing', value)
          let oldExtent = oldValue
          let extent = value
          if (!oldExtent || extent[0] !== oldExtent[0] || extent[1] !== oldExtent[1] || extent[2] !== oldExtent[2] || extent[3] !== oldExtent[3]) {
            map.fitBounds([
              [extent[1], extent[0]],
              [extent[3], extent[2]]
            ])
          }
        },
        deep: true
      },
      // activeGeopackage: {
      //   handler (value, oldValue) {
      //     this.activateGeoPackageAOI()
      //   },
      //   deep: true
      // },
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

      let extent = this.extents
      map.fitBounds([
        [extent[1], extent[0]],
        [extent[3], extent[2]]
      ])

      map.on('moveend', () => {
        let bounds = map.getBounds()
        this.setProjectExtents({projectId: this.projectId, extents: [bounds.getEast(), bounds.getSouth(), bounds.getWest(), bounds.getNorth()]})
      }, this)

      for (const layerId in this.layerConfigs) {
        let layerConfig = this.layerConfigs[layerId]
        if (!layerConfig.shown) continue

        let layer = LayerFactory.constructLayer(layerConfig)
        await layer.initialize()

        let mapLayer = layer.mapLayer
        mapLayer.addTo(map)
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
