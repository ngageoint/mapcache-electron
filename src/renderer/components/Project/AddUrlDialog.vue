<template>
  <div class="add-url-mask">
    <div class="add-url-dialog">
      <div class="add-url-inner">
        <div class="title">URL Source Preview</div>
        <div class="source-map-wrapper">
          <div id="add-url-map" class="source-map"></div>
        </div>
        <div class="source-properties">
          {{url}}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import * as vendor from '../../../lib/vendor'

  let source = {}
  let map

  export default {
    data () {
      return {
        source
      }
    },
    props: {
      url: String
    },
    computed: {
      cssProps () {
        let fillColor = '#83BFC3'
        let textColor = '#111'
        if (this.source.error) {
          fillColor = '#C00'
          textColor = '#EEE'
        }
        return {
          '--fill-color': fillColor,
          '--contrast-text-color': textColor
        }
      }
    },
    methods: {
      closeCard () {
        this.$emit('clear-processing', this.source)
      }
    },
    mounted: function () {
      map = vendor.L.map('add-url-map')
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
    }
  }
</script>

<style scoped>
.add-url-mask {
  position: absolute;
  background: rgba(34,34,34,0.75);
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 9999;
}

.add-url-dialog {
  position: absolute;
  top: 50px;
  left: 50px;
  bottom: 50px;
  right: 50px;
  background-color: white;
  z-index: 10000;
  color: black;
}

.add-url-inner {
  position: relative;
  margin: auto auto;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: scroll;
}

.source-map-wrapper {
  position: sticky;
  top: 0px;
}
.source-map {
  width: 100%;
  height: 40vh;
}

</style>
