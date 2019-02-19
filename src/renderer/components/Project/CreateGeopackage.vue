<template>
  <div class="geopackage-sidebar">
    <div class="project-name">
      Create GeoPackage
    </div>
    <div class="instruction" :class="{incomplete : !geopackageConfiguration.aoi, complete : geopackageConfiguration.aoi}">
      <div class="instruction-title">
        1) Specify the AOI
      </div>
      <div class="instruction-detail">
        Draw an AOI on the map to specify what will be included in the GeoPackage.  This AOI will be used for all layers that are selected.
      </div>
    </div>
    <div class="instruction complete">
      <div class="instruction-title">
        2) Specify zoom levels
      </div>
      <div class="instruction-detail">
        Specify zoom levels to create in the GeoPackage
      </div>
    </div>
    <div class="instruction complete">
      <div class="instruction-title">
        3) Verify Selected Layer Options
      </div>
      <div class="instruction-detail">
        Layers that will be included in the GeoPackage
      </div>
      <div class="instruction-content">
        <div v-for="layer in visibleLayers" :key="layer.id">
          Layer:
          {{layer}}
        </div>
      </div>
    </div>
    {{project}}
  </div>
</template>

<script>
  let geopackageConfiguration = {
  }

  export default {
    data () {
      return {
        geopackageConfiguration
      }
    },
    props: ['project'],
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
      },
      visibleLayers: function () {
        let layers = []
        for (const layerId in this.project.layers) {
          const layer = this.project.layers[layerId]
          if (layer.shown) {
            layers.push(layer)
          }
        }
        return layers
      }
    },
    methods: {
      closeCard () {
        this.$emit('clear-processing', this.source)
      }
    },
    mounted: function () {
      this.$emit('activate-draw')
    }
  }
</script>

<style scoped>

.geopackage-sidebar {
  padding: 15px;
  text-align: center;
  min-width: 380px;
  max-width: 500px;
  width: 30vw;
  height: 100vh;
  overflow-y: scroll;
  z-index: 100000;
}

.project-name {
  font-size: 1.4em;
  font-weight: bold;
}

.instruction.incomplete {
  color: red;
}

.instruction.complete {
  color: green;
}

.instruction-title {
  font-size: 1em;
  font-weight: bold;
  text-align: left;
}

.instruction-detail {
  font-size: .8em;
  text-align: left;
}

</style>
