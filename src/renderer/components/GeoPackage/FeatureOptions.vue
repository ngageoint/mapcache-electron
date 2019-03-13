<template>

  <div>
    <div class="instruction" :class="{incomplete : !aoi, complete : aoi}">

      <div class="instruction-title">
        1) Specify the Bounds
      </div>

      <div class="instruction-detail">
        Draw bounds on the map to specify what will be included in the GeoPackage.  This AOI will be used for all layers that are selected.
      </div>

      <bounds-ui v-if="aoi" :bounds="aoi"/>

      <a v-if="!currentlyDrawingBounds && aoi && aoi.length"
          class="bounds-button"
          @click.stop="drawBounds()">
        Update Bounds
      </a>
      <a v-if="!currentlyDrawingBounds && (!aoi || !aoi.length)"
          class="bounds-button"
          @click.stop="drawBounds()">
        Draw Bounds
      </a>
      <a v-if="currentlyDrawingBounds"
          class="bounds-button"
          @click.stop="setBounds()">
        Set Bounds
      </a>
    </div>
  </div>

</template>

<script>
  import FloatLabels from 'float-labels.js'
  import BoundsUi from '../Project/BoundsUi'
  import { mapActions, mapState } from 'vuex'

  export default {
    props: {
      options: Object,
      projectId: String,
      geopackageId: String,
      layerId: String
    },
    components: {
      BoundsUi
    },
    computed: {
      ...mapState({
        uiState (state) {
          return state.UIState[this.projectId]
        },
        drawBoundsState (state) {
          return state.UIState[this.projectId].drawBounds
        },
        boundsBeingDrawn (state) {
          return state.UIState[this.projectId].boundsBeingDrawn
        }
      }),
      currentlyDrawingBounds () {
        let layer = this.layerId || 'geopackage'
        return this.drawBoundsState[this.geopackageId][layer]
      },
      aoi: {
        get () {
          return this.options.aoi
        },
        set (value) {
          this.setGeoPackageAOI({projectId: this.projectId, geopackageId: this.geopackageId, layerId: this.layerId, aoi: value})
        }
      }
    },
    methods: {
      ...mapActions({
        activateDrawForGeoPackage: 'UIState/activateDrawForGeoPackage',
        deactivateDrawForGeoPackage: 'UIState/deactivateDrawForGeoPackage',
        setGeoPackageAOI: 'Projects/setGeoPackageAOI'
      }),
      setBounds () {
        this.deactivateDrawForGeoPackage({
          projectId: this.projectId,
          geopackageId: this.geopackageId,
          layerId: this.layerId
        })
        let layerId = this.layerId || 'geopackage'
        this.aoi = this.boundsBeingDrawn[this.geopackageId][layerId]
      },
      drawBounds () {
        this.activateDrawForGeoPackage({
          projectId: this.projectId,
          geopackageId: this.geopackageId,
          layerId: this.layerId
        })
      }
    },
    mounted: function () {
      let fl = new FloatLabels('.zoom-form', {
        style: 1
      })
      console.log('fl', fl)
    }
  }
</script>

<style scoped>
  .bounds-button {
    color: rgba(68, 152, 192, .95);
    cursor: pointer;
    font-size: 1.2em;
    font-weight: bold;
    padding: 5px;
    border-radius: 3px;
  }

  .bounds-button.selected {
    background-color: rgba(68, 152, 192, .95);
    color: rgba(255, 255, 255, .95);
    cursor: pointer;
    font-size: 1.2em;
    font-weight: bold;
  }

  .zoom-form {
    padding-top: 1em;
  }

  .invalid-label .fl-label {
    color: red !important;
  }

  .valid-label .fl-label {
    color: green !important;
  }
</style>
