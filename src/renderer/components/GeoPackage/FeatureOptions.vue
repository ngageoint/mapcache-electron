<template>

  <div>
    <div class="instruction" :class="{incomplete : !aoi, complete : aoi}">

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
         @click.stop="setExtentToLayerBounds()">
        Use Layer Bounds
      </a>
      <a v-if="currentlyDrawingBounds"
          class="bounds-button"
          @click.stop="setBounds()">
        Set Bounds
      </a>
    </div>
    <div class="instruction">

      <div class="instruction-title">
        2) Specify the layer name in the resultant GeoPackage
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
  import BoundsUi from '../Project/BoundsUi'
  import { mapActions, mapState } from 'vuex'
  import draggable from 'vuedraggable'
  import XYZTileUtilities from '../../../lib/XYZTileUtilities'

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
        editNameMode,
        enabled: true,
        dragging: false
      }
    },
    components: {
      BoundsUi,
      draggable
    },
    computed: {
      ...mapState({
        uiState (state) {
          return state.UIState[this.project.id]
        },
        drawBoundsState (state) {
          return state.UIState[this.project.id].drawBounds
        },
        boundsBeingDrawn (state) {
          return state.UIState[this.project.id].boundsBeingDrawn
        }
      }),
      layerFeatureRadioButtonID () {
        if (this.layerId) {
          return this.layerId + '_feature'
        } else {
          return 'feature'
        }
      },
      layerImageryRadioButtonID () {
        if (this.layerId) {
          return this.layerId + '_imagery'
        } else {
          return 'imagery'
        }
      },
      tileCount () {
        if (this.minZoomValue && this.maxZoomValue && this.aoi) {
          return XYZTileUtilities.tileCountInExtent(this.aoi, Number(this.minZoomValue), Number(this.maxZoomValue))
        }
      },
      currentlyDrawingBounds () {
        let layer = this.layerId || 'featureAoi'
        return this.drawBoundsState && this.drawBoundsState[this.geopackage.id] && this.drawBoundsState[this.geopackage.id][layer]
      },
      layerId () {
        return this.layer ? this.layer.id : undefined
      },
      layerNameValue () {
        return this.options.layerName || this.geopackage.multiFeatureLayerName || (this.layer ? this.layer.name : 'Layer')
      },
      aoi: {
        get () {
          return this.layerId ? this.options.aoi : this.options.featureAoi
        },
        set (value) {
          if (value) {
            let layerId = this.layerId || 'featureAoi'
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
        setFeatureLayerName: 'Projects/setFeatureLayerName'
      }),
      minZoomValid () {
        return this.minZoomValue >= 0 && this.minZoomValue <= 18 && this.minZoomValue <= this.maxZoomValue
      },
      editLayerGeoPackageName () {
        this.editNameMode = true
        setTimeout(() => {
          document.getElementById('project-name-edit').focus()
        }, 0)
      },
      saveEditedName (event) {
        this.editNameMode = false
        let geopackageNameEdit = event.target.closest('.edit-name-container').querySelector('.project-name-edit')
        this.setFeatureLayerName({projectId: this.project.id, geopackageId: this.geopackage.id, layerId: this.layerId, layerName: geopackageNameEdit.value})
      },
      cancelEditName () {
        this.editNameMode = false
      },
      setBounds () {
        let layerId = this.layerId || 'featureAoi'
        this.deactivateDrawForGeoPackage({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          layerId: layerId
        })
        this.aoi = this.boundsBeingDrawn[this.geopackage.id][layerId]
      },
      drawBounds () {
        let layerId = this.layerId || 'featureAoi'
        this.activateDrawForGeoPackage({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          layerId: layerId
        })
      },
      setExtentToLayerBounds () {
        this.aoi = [[this.layer.extent[1], this.layer.extent[0]], [this.layer.extent[3], this.layer.extent[2]]]
      }
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

  input[type=radio], p {
    display: inline;
  }

  .project-name {
    font-size: 1.4em;
    font-weight: bold;
    cursor: pointer;
    color: rgba(68, 152, 192, .95);
  }
</style>
