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
          <input
            id="featureImageryConversionMinZoom"
            v-model="minZoomValue"
            type="number"
            name="minzoom"
            min="0"
            max="18"/>
          <label for="featureImageryConversionMinZoom">Min Zoom</label>
        </div>
        <div :class="{'invalid-label': !maxZoomValid(), 'valid-label': maxZoomValid()}">
          <input
            id="featureImageryConversionMaxZoom"
            v-model="maxZoomValue"
            type="number"
            name="maxzoom"
            min="0"
            max="18"/>
          <label for="featureImageryConversionMaxZoom">Max Zoom</label>
        </div>
      </form>
    </div>

    Total Tiles: {{tileCount}}

    <div class="instruction">
      <div class="instruction-detail" v-if="layerOrder.length > 1">
        3) Order the feature layers in the order you want them drawn. Base features should be first, top level feature should be last.
        <h3>Layer Order</h3>
        <draggable
          v-model='layerOrder'
          :disabled="!enabled"
          class="list-group"
          ghost-class="ghost"
          @start="dragging = true"
          @end="dragging = false"
        >
        <div
          class="list-group-item"
          v-for="element in layerOrder"
          :key="element.name"
        >
          {{ element.name }}
        </div>
        </draggable>
      </div>
    </div>
    <div class="instruction">

      <div class="instruction-title">
        4) Specify the layer name in the resultant GeoPackage
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
  import { mapActions, mapState } from 'vuex'
  import draggable from 'vuedraggable'
  import XYZTileUtilities from '../../../lib/XYZTileUtilities'

  let editNameMode = false

  export default {
    props: {
      options: Object,
      project: Object,
      geopackage: Object
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
      tileCount () {
        if (this.minZoomValue && this.maxZoomValue && this.aoi) {
          return XYZTileUtilities.tileCountInExtent(this.aoi, Number(this.minZoomValue), Number(this.maxZoomValue))
        }
      },
      currentlyDrawingBounds () {
        return this.drawBoundsState && this.drawBoundsState[this.geopackage.id] && this.drawBoundsState[this.geopackage.id]['featureImageryConversionAoi']
      },
      layerNameValue () {
        return this.geopackage.featureImageryConversion.layerName || 'Layer'
      },
      layerOrder: {
        get () {
          if (this.geopackage.featureImageryConversion.layerOrder) {
            return this.geopackage.featureImageryConversion.layerOrder
          } else {
            return Object.keys(this.geopackage.featureToImageryLayers).map((l, i) => {
              return {
                name: this.project.layers[l].name,
                id: i
              }
            })
          }
        },
        set (value) {
          if (value) {
            this.setFeatureImageryConversionLayerOrder({projectId: this.project.id, geopackageId: this.geopackage.id, layerOrder: value})
          }
        }
      },
      aoi: {
        get () {
          return this.geopackage.featureImageryConversion.aoi
        },
        set (value) {
          if (value) {
            this.setFeatureImageryConversionAOI({projectId: this.project.id, geopackageId: this.geopackage.id, aoi: value})
          }
        }
      },
      minZoomValue: {
        get () {
          return this.geopackage.featureImageryConversion.minZoom
        },
        set (value) {
          this.setFeatureImageryConversionMinZoom({projectId: this.project.id, geopackageId: this.geopackage.id, minZoom: parseInt(value)})
        }
      },
      maxZoomValue: {
        get () {
          return this.geopackage.featureImageryConversion.maxZoom
        },
        set (value) {
          this.setFeatureImageryConversionMaxZoom({projectId: this.project.id, geopackageId: this.geopackage.id, maxZoom: parseInt(value)})
        }
      }
    },
    methods: {
      ...mapActions({
        activateDrawForGeoPackage: 'UIState/activateDrawForGeoPackage',
        deactivateDrawForGeoPackage: 'UIState/deactivateDrawForGeoPackage',
        setFeatureImageryConversionAOI: 'Projects/setFeatureImageryConversionAOI',
        setFeatureImageryConversionLayerName: 'Projects/setFeatureImageryConversionLayerName',
        setFeatureImageryConversionMinZoom: 'Projects/setFeatureImageryConversionMinZoom',
        setFeatureImageryConversionMaxZoom: 'Projects/setFeatureImageryConversionMaxZoom',
        setFeatureImageryConversionLayerOrder: 'Projects/setFeatureImageryConversionLayerOrder'
      }),
      minZoomValid () {
        console.log(this.minZoomValue >= 0 && this.minZoomValue <= 18 && this.minZoomValue <= this.maxZoomValue)
        return this.minZoomValue >= 0 && this.minZoomValue <= 18 && this.minZoomValue <= this.maxZoomValue
      },
      maxZoomValid () {
        console.log(this.maxZoomValue <= 18 && this.maxZoomValue >= 0 && this.maxZoomValue >= this.minZoomValue)
        return this.maxZoomValue <= 18 && this.maxZoomValue >= 0 && this.maxZoomValue >= this.minZoomValue
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
        console.log('name value', geopackageNameEdit.value)
        this.setFeatureImageryConversionLayerName({projectId: this.project.id, geopackageId: this.geopackage.id, layerName: geopackageNameEdit.value})
      },
      cancelEditName () {
        this.editNameMode = false
      },
      setBounds () {
        let layerId = 'featureImageryConversionAoi'
        this.deactivateDrawForGeoPackage({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          layerId: layerId
        })
        this.aoi = this.boundsBeingDrawn[this.geopackage.id][layerId]
      },
      drawBounds () {
        let layerId = 'featureImageryConversionAoi'
        this.activateDrawForGeoPackage({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          layerId: layerId
        })
      }
    },
    mounted: function () {
      this.fl = new FloatLabels('.zoom-form', {
        style: 1
      })
    },
    updated: function () {
      this.fl = new FloatLabels('.zoom-form', {
        style: 1
      })
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

  input[type=radio], p {
    display: inline;
  }

  .project-name {
    font-size: 1.4em;
    font-weight: bold;
    cursor: pointer;
    color: rgba(68, 152, 192, .95);
  }

  .list-group {
    display: flex;
    flex-direction: column;
    padding-left: 0;
    margin-bottom: 10px;
  }
  .list-group-item {
    position: relative;
    display: block;
    padding: 10px 10px;
    margin-bottom: 0px;
    color: black;
    background-color: white;
    border-top: 1px solid gray;
    border-left: 1px solid gray;
    border-right: 1px solid gray;
  }
  .list-group-item:last-child {
    border-bottom: 1px solid gray;
  }
  .list-group-item:active {
    z-index: 2;
    color: white;
    background-color: dodgerblue;
    border-color: white;
  }

</style>
