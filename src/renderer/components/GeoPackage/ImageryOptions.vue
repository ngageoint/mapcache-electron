<template>

  <div>
    <div
        class="instruction"
        :class="{incomplete : !aoi, complete : aoi}">

      <div class="instruction-title">
        1) Specify the Bounds
      </div>

      <div class="instruction-detail">
        Draw bounds on the map to specify what will be included in the GeoPackage.
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
      <a v-if="!currentlyDrawingBounds && layer && layer.extent"
         class="bounds-button"
         @click.stop="aoi = [[layer.extent[1], layer.extent[0]], [layer.extent[3], layer.extent[2]]]">
        Use Layer Bounds
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

    Total Tiles: {{tileCount}}

    <div class="instruction">

      <div class="instruction-title">
        3) Specify the layer name in the resultant GeoPackage
      </div>

      <div class="instruction-detail">
        Click to edit the layer name in the GeoPackage
      </div>
      <div v-if="!editNameMode"
           @click.stop="editLayerGeoPackageName"
           class="project-name">
        <div>{{layerNameValue}}</div>
      </div>

      <div v-show="editNameMode" class="edit-name-container add-data-outer provide-link-text">
        <form class="link-form">
          <label for="project-name-edit">Layer Name</label>
          <input
              type="text"
              class="project-name-edit"
              id="project-name-edit"
              :value="layerNameValue"
              @keydown.enter.prevent="saveEditedName"
              style="margin-bottom: 0;">
          </input>
          <div style="margin-top: 14px;">
            <a @click.stop="saveEditedName">Save</a>
            |
            <a @click.stop="cancelEditName">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  </div>

</template>

<script>
  import FloatLabels from 'float-labels.js'
  import BoundsUi from '../Project/BoundsUi'
  import XYZTileUtilities from '../../../lib/XYZTileUtilities'
  import { mapActions, mapState } from 'vuex'

  let editNameMode = false

  export default {
    props: {
      options: Object,
      project: Object,
      geopackage: Object,
      layer: Object
    },
    data () {
      return {
        editNameMode
      }
    },
    components: {
      BoundsUi
    },
    computed: {
      ...mapState({
        drawBoundsState (state) {
          return state.UIState[this.project.id].drawBounds
        },
        boundsBeingDrawn (state) {
          return state.UIState[this.project.id].boundsBeingDrawn
        }
      }),
      tileCount () {
        if (this.minZoomValue && this.maxZoomValue && this.aoi) {
          return XYZTileUtilities.tileCountInExtent(this.aoi, Number(this.minZoomValue), Number(this.maxZoomValue))
        }
      },
      currentlyDrawingBounds () {
        let layer = this.layerId || 'imageryAoi'
        return this.drawBoundsState && this.drawBoundsState[this.geopackage.id] && this.drawBoundsState[this.geopackage.id][layer]
      },
      layerId () {
        return this.layer ? this.layer.id : undefined
      },
      layerNameValue () {
        return this.options.layerName || this.geopackage.multiImageryLayerName || (this.layer ? this.layer.displayName : 'Layer')
      },
      minZoomValue: {
        get () {
          return this.options.minZoom || this.geopackage.imageryMinZoom
        },
        set (value) {
          this.setImageryMinZoom({projectId: this.project.id, geopackageId: this.geopackage.id, layerId: this.layerId, minZoom: parseInt(value)})
        }
      },
      maxZoomValue: {
        get () {
          return this.options.maxZoom || this.geopackage.imageryMaxZoom
        },
        set (value) {
          this.setImageryMaxZoom({projectId: this.project.id, geopackageId: this.geopackage.id, layerId: this.layerId, maxZoom: parseInt(value)})
        }
      },
      aoi: {
        get () {
          return this.layerId ? this.options.aoi : this.options.imageryAoi
        },
        set (value) {
          if (value) {
            let layerId = this.layerId || 'imageryAoi'
            this.setGeoPackageAOI({projectId: this.project.id, geopackageId: this.geopackage.id, layerId: layerId, aoi: value})
          }
        }
      }
    },
    methods: {
      ...mapActions({
        activateDrawForGeoPackage: 'UIState/activateDrawForGeoPackage',
        deactivateDrawForGeoPackage: 'UIState/deactivateDrawForGeoPackage',
        setGeoPackageAOI: 'Projects/setGeoPackageAOI',
        setImageryMinZoom: 'Projects/setImageryMinZoom',
        setImageryMaxZoom: 'Projects/setImageryMaxZoom',
        setImageryLayerName: 'Projects/setImageryLayerName'
      }),
      editLayerGeoPackageName () {
        this.editNameMode = true
        setTimeout(() => {
          document.getElementById('project-name-edit').focus()
        }, 0)
      },
      saveEditedName (event) {
        this.editNameMode = false
        let geopackageNameEdit = event.target.closest('.edit-name-container').querySelector('.project-name-edit')
        this.setImageryLayerName({projectId: this.project.id, geopackageId: this.geopackage.id, layerId: this.layerId, layerName: geopackageNameEdit.value, isForFeatureLayer: false})
      },
      cancelEditName () {
        this.editNameMode = false
      },
      minZoomValid () {
        return this.minZoomValue >= 0 && this.minZoomValue <= 18 && this.minZoomValue <= this.maxZoomValue
      },
      maxZoomValid () {
        return this.maxZoomValue <= 18 && this.maxZoomValue >= 0 && this.maxZoomValue >= this.minZoomValue
      },
      setBounds () {
        let layerId = this.layerId || 'imageryAoi'
        this.deactivateDrawForGeoPackage({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          layerId: layerId
        })
        this.aoi = this.boundsBeingDrawn[this.geopackage.id][layerId]
      },
      drawBounds () {
        let layerId = this.layerId || 'imageryAoi'
        this.activateDrawForGeoPackage({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          layerId: layerId
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

  .provide-link-text {
    margin-top: .6em;
    font-size: .8em;
    color: rgba(54, 62, 70, .87);
  }

  .provide-link-text a {
    color: rgba(68, 152, 192, .95);
    cursor: pointer;
  }

  .link-form {
    margin-top: 1em;
  }

  .save-name-button {
    margin-right: 5px;
  }

  .project-name {
    font-size: 1.4em;
    font-weight: bold;
    cursor: pointer;
    color: rgba(68, 152, 192, .95);
  }
</style>
