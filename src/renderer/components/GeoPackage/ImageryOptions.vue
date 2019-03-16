<template>

  <div>
    <div
        class="instruction"
        :class="{incomplete : !aoi, complete : aoi}">

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

    <div class="instruction" :class="{incomplete : (!minZoomValue || !maxZoomValue), complete : (minZoomValue && maxZoomValue)}">

      <div class="instruction-title">
        2) Specify zoom levels
      </div>

      <div class="instruction-detail">
        Specify zoom levels to create in the GeoPackage
      </div>
      <form class="zoom-form">
        <div :class="{'invalid-label': !minZoomValid(), 'valid-label': minZoomValid()}">
          <label for="minzoom">Min Zoom</label>
          <input
            id="minzoom"
            v-model="minZoomValue"
            type="number"
            name="minzoom"
            min="0"
            max="18">
        </div>
        <div :class="{'invalid-label': !maxZoomValid(), 'valid-label': maxZoomValid()}">
          <label for="maxzoom">Max Zoom</label>
          <input
            id="maxzoom"
            v-model="maxZoomValue"
            type="number"
            name="maxzoom"
            min="0"
            max="18">
        </div>
      </form>
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
        drawBoundsState (state) {
          console.log('this.projectId', this.projectId)
          return state.UIState[this.projectId].drawBounds
        },
        boundsBeingDrawn (state) {
          return state.UIState[this.projectId].boundsBeingDrawn
        }
      }),
      currentlyDrawingBounds () {
        let layer = this.layerId || 'geopackage'
        return this.drawBoundsState && this.drawBoundsState[this.geopackageId] && this.drawBoundsState[this.geopackageId][layer]
      },
      minZoomValue: {
        get () {
          return this.options.minZoom
        },
        set (value) {
          this.setMinZoom({projectId: this.projectId, geopackageId: this.geopackageId, layerId: this.layerId, minZoom: value})
        }
      },
      maxZoomValue: {
        get () {
          return this.options.maxZoom
        },
        set (value) {
          this.setMaxZoom({projectId: this.projectId, geopackageId: this.geopackageId, layerId: this.layerId, maxZoom: value})
        }
      },
      aoi: {
        get () {
          return this.options.imageryAoi
        },
        set (value) {
          let layerId = this.layerId || 'imageryAoi'
          this.setGeoPackageAOI({projectId: this.projectId, geopackageId: this.geopackageId, layerId: layerId, aoi: value})
        }
      }
    },
    methods: {
      ...mapActions({
        activateDrawForGeoPackage: 'UIState/activateDrawForGeoPackage',
        deactivateDrawForGeoPackage: 'UIState/deactivateDrawForGeoPackage',
        setGeoPackageAOI: 'Projects/setGeoPackageAOI',
        setMinZoom: 'Projects/setMinZoom',
        setMaxZoom: 'Projects/setMaxZoom'
      }),
      minZoomValid () {
        return this.minZoomValue >= 0 && this.minZoomValue <= 18 && this.minZoomValue <= this.maxZoomValue
      },
      maxZoomValid () {
        return this.maxZoomValue <= 18 && this.maxZoomValue >= 0 && this.maxZoomValue >= this.minZoomValue
      },
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
