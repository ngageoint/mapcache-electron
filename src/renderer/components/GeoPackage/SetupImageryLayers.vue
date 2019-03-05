<template>
  <div class="instruction">
    <step-buttons :step="2" :back="back" :next="next" :top="true" :steps="5"></step-buttons>
    <div class="instruction-title">
      Imagery Layers Setup
    </div>
    <div class="instruction-detail">
      Instruction information about setting up the imagery layers in the GeoPackage
    </div>
    <div class="instruction-configuration">
      <div class="imagery-layers">
        <div v-for="imageryLayer in imageryLayers">
          <div class="layer-group-header">
            {{imageryLayer.name}}
          </div>
          <!-- <layer-header class="layer-header" :layer="imageryLayer" :geopackage="geopackage"/> -->
        </div>
      </div>
    </div>
    <step-buttons :step="2" :back="back" :next="next" :bottom="true" :steps="5"></step-buttons>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import LayerHeader from './LayerHeader'
  import StepButtons from './StepButtons'

  export default {
    props: ['project', 'geopackage'],
    components: {
      LayerHeader,
      StepButtons
    },
    methods: {
      ...mapActions({
        updateGeopackageLayers: 'Projects/updateGeopackageLayers',
        setGeoPackageStepNumber: 'Projects/setGeoPackageStepNumber'
      }),
      next () {
        this.updateGeopackageLayers({
          projectId: this.project.id,
          imageryLayers: this.imageryLayers,
          featureLayers: this.featureLayers,
          geopackageId: this.geopackage.id
        })
        this.setGeoPackageStepNumber({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          step: 3
        })
      },
      back () {
        this.setGeoPackageStepNumber({
          projectId: this.project.id,
          geopackageId: this.geopackage.id,
          step: 1
        })
      }
    },
    created: function () {
      this.imageryLayers = this.geopackage.imageryLayers || {}
      this.featureLayers = this.geopackage.featureLayers || {}
      for (const layerId in this.project.layers) {
        let layer = this.project.layers[layerId]
        if (layer.pane === 'tile' && !this.imageryLayers[layerId]) {
          this.imageryLayers[layerId] = {
            id: layer.id,
            included: layer.shown,
            name: layer.name,
            style: layer.style
          }
        }
        if (layer.pane === 'vector' && !this.featureLayers[layerId]) {
          this.featureLayers[layerId] = {
            id: layer.id,
            included: layer.shown,
            name: layer.name,
            style: layer.style
          }
        }
      }
    }
  }
</script>

<style scoped>
  .layer-group-header {
    font-size: 1.2em;
    font-weight: bold;
    text-align: left;
  }
  .layer-header {
    border: 1px solid rgba(54, 62, 70, .5);
    border-width: 1px;
    border-radius: 5px;
    height: 3em;
    margin-top: 1em;
    margin-bottom: 1em;
  }
  .layer-coordinates {
    padding: 5px 10px;
  }
  .coordinate-container {
    padding-top: 5px;
  }
  .coordinate-divider {
    margin-left: 15px;
    margin-right: 15px;
  }
  .layer__horizontal__divider {
    height: 1px;
    background: #ECECEC;
  }

  .instruction {
    margin-bottom: 1em;
  }

  .instruction-title {
    font-size: 1.5em;
    font-weight: bold;
    text-align: left;
  }

  .instruction-detail {
    font-size: .9em;
    text-align: left;
  }

  .instruction-buttons {
    width: 100%;
    display: flex;
    flex-flow: row;
    justify-content: center;
  }

  .instruction-buttons.top {
    padding-bottom: 1em;
  }

  .instruction-buttons.bottom {
    padding-top: 1em;
  }

  .step-indicators {
    font-size: .5em;
    line-height: 28px;
    flex-grow: 1;
  }

  .step-button {
    color: rgba(68, 152, 192, .95);
    cursor: pointer;
    font-size: 1.2em;
    font-weight: bold;
    width: 25%;
  }

  .step-button.back {
    text-align: left;
  }

  .step-button.next {
    text-align: right;
  }

  .current-step {
    color: rgba(68, 152, 192, .95);
  }
</style>
