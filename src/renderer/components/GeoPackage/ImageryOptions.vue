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
              @keydown.enter.prevent="saveEditedName">
          </input>
          <div class="provide-link-buttons">
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
      projectId: String,
      geopackageId: String,
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
          return state.UIState[this.projectId].drawBounds
        },
        boundsBeingDrawn (state) {
          return state.UIState[this.projectId].boundsBeingDrawn
        }
      }),
      tileCount () {
        if (this.minZoomValue && this.maxZoomValue && this.aoi) {
          return XYZTileUtilities.tileCountInExtent(this.aoi, Number(this.minZoomValue), Number(this.maxZoomValue))
        }
      },
      currentlyDrawingBounds () {
        let layer = this.layerId || 'imageryAoi'
        return this.drawBoundsState && this.drawBoundsState[this.geopackageId] && this.drawBoundsState[this.geopackageId][layer]
      },
      layerId () {
        return this.layer ? this.layer.id : undefined
      },
      layerNameValue () {
        return this.options.layerName || (this.layer ? this.layer.name : 'Layer')
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
          return this.layerId ? this.options.aoi : this.options.imageryAoi
        },
        set (value) {
          if (value) {
            let layerId = this.layerId || 'imageryAoi'
            this.setGeoPackageAOI({projectId: this.projectId, geopackageId: this.geopackageId, layerId: layerId, aoi: value})
          }
        }
      }
    },
    methods: {
      ...mapActions({
        activateDrawForGeoPackage: 'UIState/activateDrawForGeoPackage',
        deactivateDrawForGeoPackage: 'UIState/deactivateDrawForGeoPackage',
        setGeoPackageAOI: 'Projects/setGeoPackageAOI',
        setMinZoom: 'Projects/setMinZoom',
        setMaxZoom: 'Projects/setMaxZoom',
        setLayerName: 'Projects/setLayerName'
      }),
      editLayerGeoPackageName () {
        this.editNameMode = true
        setTimeout(() => {
          document.getElementById('project-name-edit').focus()
        }, 0)
      },
      saveEditedName (event) {
        this.editNameMode = false
        console.log('this.layerId', this.layerId)
        let geopackageNameEdit = event.target.closest('.edit-name-container').querySelector('.project-name-edit')
        console.log('name value', geopackageNameEdit.value)
        this.setLayerName({projectId: this.projectId, geopackageId: this.geopackageId, layerId: this.layerId, layerName: geopackageNameEdit.value})
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
          projectId: this.projectId,
          geopackageId: this.geopackageId,
          layerId: layerId
        })
        this.aoi = this.boundsBeingDrawn[this.geopackageId][layerId]
      },
      drawBounds () {
        let layerId = this.layerId || 'imageryAoi'
        this.activateDrawForGeoPackage({
          projectId: this.projectId,
          geopackageId: this.geopackageId,
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

  .provide-link-buttons {
    margin-top: -10px;
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
